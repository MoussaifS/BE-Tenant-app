'use strict';

/**
 * booking controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

/**
 * Convert date string from DD/MM/YYYY to ISO datetime format
 * @param {string} dateStr - Date in DD/MM/YYYY format
 * @param {string} timeStr - Time string (e.g., "15:45:00")
 * @returns {string} ISO datetime string
 */
function convertDateToISO(dateStr, timeStr = '15:45:00') {
  if (!dateStr) return null;
  
  // Handle different date formats
  let day, month, year;
  
  // Check if it's already in ISO format
  if (dateStr.includes('T') || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr;
  }
  
  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assume DD/MM/YYYY format
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
    }
  } else {
    // Try to parse as-is
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  }
  
  if (!day || !month || !year) {
    return null;
  }
  
  // Create ISO datetime string: YYYY-MM-DDTHH:mm:ss.sssZ
  const isoString = `${year}-${month}-${day}T${timeStr}.000Z`;
  return isoString;
}

module.exports = createCoreController('api::booking.booking', ({ strapi }) => ({
  /**
   * Create or update booking from n8n agent
   * POST /api/bookings/create-from-n8n
   * Accepts booking data from n8n in various formats
   */
  async createFromN8n(ctx) {
    try {
      const body = ctx.request.body;
      
      // Handle both direct data and wrapped data formats
      let bookingData = body.data || body;
      
      // Extract fields (handle various naming conventions)
      const bookingReference = bookingData.Booking_Reference_Number || 
                               bookingData.bookingReference || 
                               bookingData.booking_reference_number;
      
      const arrivalRaw = bookingData.Arrival || 
                        bookingData.arrival || 
                        bookingData.aravial; // Handle typo
      
      const departureRaw = bookingData.Departure || 
                          bookingData.departure;
      
      const accommodation = bookingData.Accommodation || 
                           bookingData.accommodation;
      
      // Validate required fields
      if (!bookingReference) {
        ctx.status = 400;
        ctx.body = {
          error: 'Booking reference is required',
          code: 'MISSING_BOOKING_REFERENCE'
        };
        return;
      }
      
      if (!arrivalRaw) {
        ctx.status = 400;
        ctx.body = {
          error: 'Arrival date is required',
          code: 'MISSING_ARRIVAL'
        };
        return;
      }
      
      if (!departureRaw) {
        ctx.status = 400;
        ctx.body = {
          error: 'Departure date is required',
          code: 'MISSING_DEPARTURE'
        };
        return;
      }
      
      if (!accommodation) {
        ctx.status = 400;
        ctx.body = {
          error: 'Accommodation is required',
          code: 'MISSING_ACCOMMODATION'
        };
        return;
      }
      
      // Convert dates to ISO format
      // Arrival time: 15:45:00 (3:45 PM)
      // Departure time: 12:30:00 (12:30 PM)
      const arrivalISO = convertDateToISO(String(arrivalRaw), '15:45:00');
      const departureISO = convertDateToISO(String(departureRaw), '12:30:00');
      
      if (!arrivalISO || !departureISO) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid date format. Expected DD/MM/YYYY or ISO format.',
          code: 'INVALID_DATE_FORMAT',
          received: {
            arrival: arrivalRaw,
            departure: departureRaw
          }
        };
        return;
      }
      
      // Convert booking reference to number
      const bookingRefNumber = typeof bookingReference === 'string' 
        ? parseInt(bookingReference, 10) 
        : bookingReference;
      
      if (isNaN(bookingRefNumber)) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid booking reference format',
          code: 'INVALID_BOOKING_REFERENCE'
        };
        return;
      }
      
      // Prepare booking data
      const bookingPayload = {
        Booking_Reference_Number: bookingRefNumber,
        Arrival: arrivalISO,
        Departure: departureISO,
        Accommodation: String(accommodation)
      };
      
      // Check if booking already exists
      const existingBookings = await strapi.entityService.findMany('api::booking.booking', {
        filters: {
          Booking_Reference_Number: bookingRefNumber
        }
      });
      
      let result;
      if (existingBookings && existingBookings.length > 0) {
        // Update existing booking
        const existingBooking = existingBookings[0];
        result = await strapi.entityService.update('api::booking.booking', existingBooking.id, {
          data: bookingPayload
        });
        
        ctx.status = 200;
        ctx.body = {
          success: true,
          message: 'Booking updated successfully',
          data: result
        };
      } else {
        // Create new booking
        result = await strapi.entityService.create('api::booking.booking', {
          data: bookingPayload
        });
        
        ctx.status = 201;
        ctx.body = {
          success: true,
          message: 'Booking created successfully',
          data: result
        };
      }
      
    } catch (error) {
      console.error('Error creating/updating booking from n8n:', error);
      
      // Handle unique constraint violation
      if (error.message && error.message.includes('unique')) {
        ctx.status = 409;
        ctx.body = {
          error: 'Booking reference already exists',
          code: 'DUPLICATE_BOOKING_REFERENCE'
        };
        return;
      }
      
      ctx.status = 500;
      ctx.body = {
        error: 'An error occurred while processing the booking',
        code: 'SERVER_ERROR',
        message: error.message
      };
    }
  },

  // Custom authentication method
  async authenticate(req, res) {
    try {
      const { bookingReference } = req.body;

      if (!bookingReference) {
        return res.status(400).json({
          error: 'Booking reference is required',
          code: 'MISSING_REFERENCE'
        });
      }

      // Find booking by reference number
      const booking = await strapi.entityService.findMany('api::booking.booking', {
        filters: {
          Booking_Reference_Number: bookingReference
        },
        populate: '*'
      });

      if (!booking || booking.length === 0) {
        return res.status(404).json({
          error: 'Invalid booking reference. Please check your booking confirmation.',
          code: 'INVALID_REFERENCE'
        });
      }

      const bookingData = booking[0];
      const now = new Date();
      const arrivalDate = new Date(bookingData.Arrival);
      const departureDate = new Date(bookingData.Departure);

      // Set specific times: 3:45 PM for arrival, 12:30 PM for departure
      const arrivalTime = new Date(arrivalDate);
      arrivalTime.setHours(15, 45, 0, 0); // 3:45 PM

      const departureTime = new Date(departureDate);
      departureTime.setHours(12, 30, 0, 0); // 12:30 PM

      // Check if too early (before arrival at 3:45 PM)
      if (now < arrivalTime) {
        return res.status(403).json({
          error: `Your access begins on ${arrivalDate.toLocaleDateString()} at 3:45 PM. Please check in after this time.`,
          code: 'TOO_EARLY',
          arrivalTime: arrivalTime.toISOString()
        });
      }

      // Check if too late (after departure at 12:00 PM)
      if (now > departureTime) {
        return res.status(403).json({
          error: 'Your booking period has ended. If you need assistance, please contact support.',
          code: 'TOO_LATE',
          departureTime: departureTime.toISOString()
        });
      }

      // Generate JWT token with expiration set to departure time
      const tokenPayload = {
        bookingReference: bookingData.Booking_Reference_Number,
        arrivalDate: arrivalDate.toISOString(),
        departureDate: departureDate.toISOString(),
        accommodation: bookingData.Accommodation
      };

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(tokenPayload, jwtSecret, {
        expiresIn: Math.floor((departureTime.getTime() - now.getTime()) / 1000) // Expires at departure time
      });

      // Create or update guest record
      const existingGuest = await strapi.entityService.findMany('api::guest.guest', {
        filters: {
          Booking_Reference_Number: bookingReference
        }
      });

      const guestData = {
        Booking_Reference_Number: bookingReference,
        last_signin: now.toISOString(),
        signin_count: existingGuest.length > 0 ? (existingGuest[0].signin_count || 0) + 1 : 1,
        jwt_token: token,
        token_expires_at: departureTime.toISOString()
      };

      if (existingGuest.length > 0) {
        // Update existing guest
        await strapi.entityService.update('api::guest.guest', existingGuest[0].id, {
          data: guestData
        });
      } else {
        // Create new guest record
        guestData.first_signup = now.toISOString();
        await strapi.entityService.create('api::guest.guest', {
          data: guestData
        });
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message: `Welcome! You're successfully signed in. Access valid until ${departureDate.toLocaleDateString()} at 12:00 PM.`,
        token,
        booking: {
          reference: bookingData.Booking_Reference_Number,
          arrival: arrivalDate.toISOString(),
          departure: departureDate.toISOString(),
          accommodation: bookingData.Accommodation
        },
        accessValidUntil: departureTime.toISOString()
      });

    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'An error occurred during authentication. Please try again.',
        code: 'SERVER_ERROR'
      });
    }
  }
}));
