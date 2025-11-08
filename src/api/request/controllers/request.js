'use strict';

/**
 * request controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::request.request', ({ strapi }) => ({
  // Override create method to use custom booking JWT validation and Arqam CRM integration
  async create(ctx) {
    try {
      // Get JWT token from Authorization header
      const authHeader = ctx.request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = {
          error: 'Authorization token required',
          code: 'UNAUTHORIZED'
        };
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

      // Verify and decode JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (error) {
        ctx.status = 401;
        ctx.body = {
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        };
        return;
      }

      // Get booking reference from token or request data
      const tokenBookingReference = typeof decoded === 'object' && decoded !== null 
        ? decoded.bookingReference 
        : null;
      const requestBookingReference = ctx.request.body.data?.Reference_Number;

      // Validate that the booking reference in the token matches the request
      if (requestBookingReference && tokenBookingReference) {
        const requestRef = String(requestBookingReference);
        const tokenRef = String(tokenBookingReference);
        if (requestRef !== tokenRef) {
          ctx.status = 403;
          ctx.body = {
            error: 'Booking reference mismatch',
            code: 'REFERENCE_MISMATCH'
          };
          return;
        }
      }

      // Use the booking reference from token if not provided in request
      if (!requestBookingReference && tokenBookingReference) {
        if (!ctx.request.body.data) {
          ctx.request.body.data = {};
        }
        ctx.request.body.data.Reference_Number = tokenBookingReference;
      }

      // Get booking data to extract accommodation (room number)
      let roomNumber = ctx.request.body.data?.roomnumber;
      if (!roomNumber && tokenBookingReference) {
        try {
          const booking = await strapi.entityService.findMany('api::booking.booking', {
            filters: {
              Booking_Reference_Number: tokenBookingReference
            },
            limit: 1
          });
          if (booking && booking.length > 0) {
            roomNumber = booking[0].Accommodation || null;
          }
        } catch (error) {
          console.error('Error fetching booking for room number:', error);
        }
      }

      // Set roomnumber if not provided
      if (!ctx.request.body.data.roomnumber && roomNumber) {
        ctx.request.body.data.roomnumber = roomNumber;
      }

      // Call the default create method
      const response = await super.create(ctx);
      
      // Log the response for debugging
      console.log('📋 Request created successfully:', JSON.stringify(response.data, null, 2));
      
      // Send to Arqam CRM if request was created successfully
      if (response && response.data) {
        console.log('🔄 Attempting to send to Arqam CRM...');
        try {
          const arqaamResult = await sendToArqaamCRM(response.data, strapi);
          console.log('✅ Arqam CRM call completed:', arqaamResult);
        } catch (arqaamError) {
          console.error('❌ Error sending to Arqam CRM:', arqaamError);
          console.error('❌ Error stack:', arqaamError.stack);
          // Don't fail the request if Arqam CRM fails - log and continue
        }
      } else {
        console.warn('⚠️ No response data found, skipping Arqam CRM send');
      }

      return response;
    } catch (error) {
      console.error('Error creating request:', error);
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      };
    }
  }
}));

/**
 * Send request to Arqam CRM API
 * @param {Object} requestData - The request data from Strapi
 * @param {Object} strapi - Strapi instance
 */
async function sendToArqaamCRM(requestData, strapi) {
  console.log('🔍 sendToArqaamCRM called with requestData:', JSON.stringify(requestData, null, 2));
  
  const arqaamApiKey = process.env.ARQAAM_API_KEY || 'oAjmQCgFLxFyOjAM';
  const arqaamApiUrl = process.env.ARQAAM_API_URL || 'https://nuzul.arqaam.sa/ws/application.php';

  console.log('🔑 Arqam API Key:', arqaamApiKey ? 'Set' : 'Missing');
  console.log('🌐 Arqam API URL:', arqaamApiUrl);

  // Map request type to Arqam format
  const requestTypeMap = {
    'extending': 'طلب تمديد',
    'cleaning': 'نظافة',
    'maintenance': 'صيانة'
  };

  const requesttype = requestTypeMap[requestData.type] || requestData.requesttype || 'صيانة';
  console.log('📝 Request type:', requestData.type, '→', requesttype);
  
  // Ensure requestcategory is set properly based on request type
  let requestcategory = requestData.requestcategory;
  if (!requestcategory || (typeof requestcategory === 'string' && requestcategory.trim() === '')) {
    // Set default category based on request type
    if (requesttype === 'طلب تمديد') {
      requestcategory = 'طلبات النزلاء';
    } else if (requesttype === 'نظافة') {
      // For cleaning requests, try to extract category from note/details
      const noteText = (requestData.note || requestData.details || '').toLowerCase();
      if (noteText.includes('ستوديو')) {
        requestcategory = 'تنظيف ستوديو';
      } else if (noteText.includes('1 غرفة') || noteText.includes('1 bedroom')) {
        requestcategory = 'تنظيف شقة 1 غرفة';
      } else if (noteText.includes('2 غرفة') || noteText.includes('2 bedroom')) {
        requestcategory = 'تنظيف شقة 2 غرفة';
      } else if (noteText.includes('3 غرف') || noteText.includes('3 bedroom')) {
        requestcategory = 'تنظيف شقة 3 غرف';
      } else {
        // Default cleaning category
        requestcategory = 'تنظيف ستوديو';
      }
    } else {
      // For maintenance, use the category from request or default
      requestcategory = requestData.requestcategory || 'صيانة';
    }
  }
  
  // Ensure dates are in correct format for Arqam CRM
  // For extension requests, dates should include time: "YYYY-MM-DD HH:mm:ss"
  // For other requests, dates can be "YYYY-MM-DD" or "null"
  let datechekin = requestData.datechekin || 'null';
  let datechekout = requestData.datechekout || 'null';
  
  // For extension requests, ensure dates have time component
  if (requesttype === 'طلب تمديد') {
    // If date doesn't have time, add default times
    if (datechekin !== 'null' && !datechekin.includes(' ')) {
      datechekin = `${datechekin} 15:45:00`; // Check-in time
    }
    if (datechekout !== 'null' && !datechekout.includes(' ')) {
      datechekout = `${datechekout} 12:30:00`; // Check-out time
    }
  }
  
  // Prepare Arqam CRM payload
  const arqaamPayload = {
    key: arqaamApiKey,
    name: requestData.name || 'Guest',
    phone: requestData.phone || requestData.Phone_Number || '',
    requesttype: requesttype,
    requestcategory: requestcategory,
    roomnumber: requestData.roomnumber || '',
    datechekout: datechekout,
    datechekin: datechekin,
    note: requestData.note || requestData.details || ''
  };
  
  // Log the payload for debugging
  console.log('📤 Sending to Arqam CRM:', JSON.stringify(arqaamPayload, null, 2));

  try {
    console.log('🌐 Making fetch request to Arqam CRM...');
    console.log('📤 Payload being sent:', JSON.stringify(arqaamPayload, null, 2));
    
    // Use native fetch (Node 18+)
    const response = await fetch(arqaamApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(arqaamPayload)
    });

    console.log('📡 Arqam CRM response status:', response.status);
    console.log('📡 Arqam CRM response headers:', Object.fromEntries(response.headers.entries()));

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
      console.log('📥 Arqam CRM JSON response:', JSON.stringify(responseData, null, 2));
    } else {
      const text = await response.text();
      responseData = { status: response.status, text };
      console.log('📥 Arqam CRM text response:', text);
    }
    
    // Update request with Arqam CRM status
    if (requestData.id) {
      try {
        await strapi.entityService.update('api::request.request', requestData.id, {
          data: {
            arqaam_sent: true,
            arqaam_response: responseData
          }
        });
        console.log('✅ Updated request with Arqam status');
      } catch (updateError) {
        console.error('❌ Error updating request with Arqam status:', updateError);
      }
    } else {
      console.warn('⚠️ No request ID found, cannot update Arqam status');
    }

    console.log('✅ Request sent to Arqam CRM successfully');
    return responseData;
  } catch (error) {
    console.error('❌ Error sending to Arqam CRM:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Update request with error status
    if (requestData.id) {
      try {
        await strapi.entityService.update('api::request.request', requestData.id, {
          data: {
            arqaam_sent: false,
            arqaam_response: { error: error.message, stack: error.stack }
          }
        });
        console.log('✅ Updated request with error status');
      } catch (updateError) {
        console.error('❌ Error updating request with Arqam error status:', updateError);
      }
    }
    
    throw error;
  }
}
