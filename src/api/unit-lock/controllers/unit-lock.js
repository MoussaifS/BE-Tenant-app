'use strict';

/**
 * unit-lock controller
 * Handles fetching unit lock data from n8n webhook
 * Does not store data in database
 */

const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

module.exports = {
  /**
   * POST /api/unit-lock
   * Triggers n8n webhook to fetch unit lock data
   * Requires JWT authentication
   */
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

      // Get reference from token or request body
      const tokenBookingReference = typeof decoded === 'object' && decoded !== null ? decoded.bookingReference : null;
      const requestReference = ctx.request.body.reference;
      const reference = requestReference || tokenBookingReference;

      if (!reference) {
        ctx.status = 400;
        ctx.body = {
          error: 'Booking reference is required',
          code: 'MISSING_REFERENCE'
        };
        return;
      }

      // Convert reference to number (Booking_Reference_Number is biginteger)
      const referenceNumber = typeof reference === 'string' ? parseInt(reference, 10) : reference;
      
      if (isNaN(referenceNumber)) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid booking reference format',
          code: 'INVALID_REFERENCE_FORMAT'
        };
        return;
      }

      console.log('Looking up booking with reference:', referenceNumber, 'Type:', typeof referenceNumber);

      // Find booking by reference number to get accommodation
      const bookings = await strapi.entityService.findMany('api::booking.booking', {
        filters: {
          Booking_Reference_Number: referenceNumber
        }
      });

      console.log('Found bookings:', bookings ? bookings.length : 0);

      if (!bookings || bookings.length === 0) {
        ctx.status = 404;
        ctx.body = {
          error: 'Booking not found',
          code: 'BOOKING_NOT_FOUND'
        };
        return;
      }

      const booking = bookings[0];
      const accommodation = booking.Accommodation;

      if (!accommodation) {
        ctx.status = 400;
        ctx.body = {
          error: 'Accommodation not found for this booking',
          code: 'MISSING_ACCOMMODATION'
        };
        return;
      }

      // Extract unit number from accommodation (e.g., "Alaredh R234" -> "R234")
      // Accommodation format is usually "name Rnumber" or just "Rnumber"
      const unitMatch = accommodation.match(/R\d+/i);
      if (!unitMatch) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid accommodation format. Could not extract unit number.',
          code: 'INVALID_ACCOMMODATION_FORMAT'
        };
        return;
      }

      const unitNumber = unitMatch[0]; // e.g., "R234"

      // Get n8n webhook URL and JWT secret from environment variables
      const n8nWebhookUrl = 'https://n8n-production-c20f.up.railway.app/webhook/workflow';
      const n8nJwtSecret =  '2025@Nuzul';

      // Prepare request to n8n webhook with unit number
      // n8n expects form data with col_2 as the key
      const n8nRequestData = {
        col_2: unitNumber
      };

      // Generate JWT token for n8n authentication
      const n8nJwtToken = jwt.sign(
        {
          bookingReference: String(referenceNumber),
          iat: Math.floor(Date.now() / 1000)
        },
        n8nJwtSecret,
        {
          algorithm: 'HS256',
          expiresIn: '1h'
        }
      );

      // Call n8n webhook with JWT authentication
      console.log(`[n8n] Calling webhook URL: ${n8nWebhookUrl}`);
      const webhookResult = await callN8nWebhook(n8nWebhookUrl, n8nRequestData, n8nJwtToken);

      if (!webhookResult.success) {
        ctx.status = webhookResult.status || 500;
        
        // Provide more helpful error message for webhook registration errors
        let errorMessage = webhookResult.error || 'Failed to fetch unit lock data from n8n';
        if (webhookResult.code === 'WEBHOOK_NOT_REGISTERED') {
          // Check for common path issues
          const urlPath = new URL(n8nWebhookUrl).pathname;
          let pathHint = '';
          if (urlPath.includes('/webhook/') && !urlPath.includes('/webhook-test/')) {
            pathHint = `\n⚠️ PATH ISSUE DETECTED: Your URL path is "${urlPath}" but it should include "/webhook-test/" before the webhook ID.\n` +
              `   Current: ${n8nWebhookUrl}\n` +
              `   Should be: ${n8nWebhookUrl.replace('/webhook/', '/webhook-test/')}\n`;
          }
          
          errorMessage = `n8n webhook is not registered. Please verify that:\n` +
            `1. The webhook URL in N8N_UNIT_LOCK_WEBHOOK_URL is correct${pathHint}` +
            `2. The n8n workflow is ACTIVE (toggled ON) - production URLs require active workflows\n` +
            `3. The webhook path matches exactly what's shown in the n8n Webhook node\n` +
            `4. For production URLs, ensure the workflow is activated in n8n\n` +
            `\nOriginal error: ${webhookResult.error}`;
        }
        
        ctx.body = {
          error: errorMessage,
          code: webhookResult.code || 'WEBHOOK_ERROR',
          details: webhookResult.response ? `n8n response: ${webhookResult.response}` : undefined
        };
        return;
      }

      // Transform n8n response to expected format
      console.log('Raw n8n response:', JSON.stringify(webhookResult.data, null, 2));
      const transformedData = transformN8nResponse(webhookResult.data);
      console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

      // Return the transformed data from n8n without storing in database
      ctx.status = 200;
      ctx.body = {
        data: transformedData
      };
    } catch (error) {
      console.error('Error in unit-lock create:', error);
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      };
    }
  },

  /**
   * GET /api/unit-lock
   * Retrieves unit lock data (calls n8n webhook)
   * Requires JWT authentication
   */
  async find(ctx) {
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

      // Get reference from token or query params
      const tokenBookingReference = typeof decoded === 'object' && decoded !== null ? decoded.bookingReference : null;
      const reference = ctx.request.query.reference || tokenBookingReference;

      if (!reference) {
        ctx.status = 400;
        ctx.body = {
          error: 'Booking reference is required',
          code: 'MISSING_REFERENCE'
        };
        return;
      }

      // Convert reference to number (Booking_Reference_Number is biginteger)
      const referenceNumber = typeof reference === 'string' ? parseInt(reference, 10) : reference;
      
      if (isNaN(referenceNumber)) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid booking reference format',
          code: 'INVALID_REFERENCE_FORMAT'
        };
        return;
      }

      console.log('Looking up booking with reference:', referenceNumber, 'Type:', typeof referenceNumber);

      // Find booking by reference number to get accommodation
      const bookings = await strapi.entityService.findMany('api::booking.booking', {
        filters: {
          Booking_Reference_Number: referenceNumber
        }
      });

      console.log('Found bookings:', bookings ? bookings.length : 0);

      if (!bookings || bookings.length === 0) {
        ctx.status = 404;
        ctx.body = {
          error: 'Booking not found',
          code: 'BOOKING_NOT_FOUND'
        };
        return;
      }

      const booking = bookings[0];
      const accommodation = booking.Accommodation;

      if (!accommodation) {
        ctx.status = 400;
        ctx.body = {
          error: 'Accommodation not found for this booking',
          code: 'MISSING_ACCOMMODATION'
        };
        return;
      }

      // Extract unit number from accommodation (e.g., "Alaredh R234" -> "R234")
      // Accommodation format is usually "name Rnumber" or just "Rnumber"
      const unitMatch = accommodation.match(/R\d+/i);
      if (!unitMatch) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid accommodation format. Could not extract unit number.',
          code: 'INVALID_ACCOMMODATION_FORMAT'
        };
        return;
      }

      const unitNumber = unitMatch[0]; // e.g., "R234"

      // Get n8n webhook URL and JWT secret from environment variables
      const n8nWebhookUrl = 'https://n8n-production-c20f.up.railway.app/webhook/workflow';
      const n8nJwtSecret = '2025@Nuzul';

      // Prepare request to n8n webhook with unit number
      // n8n expects form data with col_2 as the key
      const n8nRequestData = {
        col_2: unitNumber
      };

      // Generate JWT token for n8n authentication
      const n8nJwtToken = jwt.sign(
        {
          bookingReference: String(referenceNumber),
          iat: Math.floor(Date.now() / 1000)
        },
        n8nJwtSecret,
        {
          algorithm: 'HS256',
          expiresIn: '1h'
        }
      );

      // Call n8n webhook with JWT authentication
      console.log(`[n8n] Calling webhook URL: ${n8nWebhookUrl}`);
      const webhookResult = await callN8nWebhook(n8nWebhookUrl, n8nRequestData, n8nJwtToken);

      if (!webhookResult.success) {
        ctx.status = webhookResult.status || 500;
        
        // Provide more helpful error message for webhook registration errors
        let errorMessage = webhookResult.error || 'Failed to fetch unit lock data from n8n';
        if (webhookResult.code === 'WEBHOOK_NOT_REGISTERED') {
          // Check for common path issues
          const urlPath = new URL(n8nWebhookUrl).pathname;
          let pathHint = '';
          if (urlPath.includes('/webhook/') && !urlPath.includes('/webhook-test/')) {
            pathHint = `\n⚠️ PATH ISSUE DETECTED: Your URL path is "${urlPath}" but it should include "/webhook-test/" before the webhook ID.\n` +
              `   Current: ${n8nWebhookUrl}\n` +
              `   Should be: ${n8nWebhookUrl.replace('/webhook/', '/webhook-test/')}\n`;
          }
          
          errorMessage = `n8n webhook is not registered. Please verify that:\n` +
            `1. The webhook URL in N8N_UNIT_LOCK_WEBHOOK_URL is correct${pathHint}` +
            `2. The n8n workflow is ACTIVE (toggled ON) - production URLs require active workflows\n` +
            `3. The webhook path matches exactly what's shown in the n8n Webhook node\n` +
            `4. For production URLs, ensure the workflow is activated in n8n\n` +
            `\nOriginal error: ${webhookResult.error}`;
        }
        
        ctx.body = {
          error: errorMessage,
          code: webhookResult.code || 'WEBHOOK_ERROR',
          details: webhookResult.response ? `n8n response: ${webhookResult.response}` : undefined
        };
        return;
      }

      // Transform n8n response to expected format
      console.log('Raw n8n response:', JSON.stringify(webhookResult.data, null, 2));
      const transformedData = transformN8nResponse(webhookResult.data);
      console.log('Transformed data:', JSON.stringify(transformedData, null, 2));

      // Return the transformed data from n8n without storing in database
      ctx.status = 200;
      ctx.body = {
        data: transformedData
      };
    } catch (error) {
      console.error('Error in unit-lock find:', error);
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      };
    }
  }
};

/**
 * Transform n8n webhook response to expected format
 * n8n returns data with col_2, col_3, col_4, col_5, col_6, col_7 structure
 * @param {object} n8nData - Raw response from n8n webhook
 * @returns {object} Transformed data matching UnitLockData interface
 */
function transformN8nResponse(n8nData) {
  // Handle different response formats
  let rowData = null;
  
  console.log('Transforming n8n response:', typeof n8nData, Array.isArray(n8nData));
  
  // If response is an array, get first element
  if (Array.isArray(n8nData) && n8nData.length > 0) {
    rowData = n8nData[0];
    console.log('Found array response, using first element');
  } else if (typeof n8nData === 'object' && n8nData !== null) {
    // If response has a row_number property (n8n row format)
    if (n8nData.row_number !== undefined || n8nData.rowNumber !== undefined) {
      rowData = n8nData;
      console.log('Found row_number format');
    } else if (n8nData.data && Array.isArray(n8nData.data) && n8nData.data.length > 0) {
      rowData = n8nData.data[0];
      console.log('Found data array');
    } else {
      // Check if object has col_* properties directly
      if (n8nData.col_2 || n8nData.col_4 || n8nData.col_6 || n8nData.col_7) {
        rowData = n8nData;
        console.log('Found col_* properties directly');
      } else {
        rowData = n8nData;
        console.log('Using object as row data');
      }
    }
  }

  if (!rowData) {
    console.warn('Unexpected n8n response format:', JSON.stringify(n8nData, null, 2));
    return {
      unit: null,
      development: null,
      buildingPassword: null,
      apartmentPassword: null
    };
  }

  console.log('Row data:', JSON.stringify(rowData, null, 2));

  // Extract values from col_2, col_4, col_5, col_6, col_7
  const unit = rowData.col_2 || null; // Reference (e.g., "R217")
  const development = rowData.col_4 || null; // Development (e.g., "Details Alaredh")
  const units = rowData.col_5 || null; // Units (e.g., "D5")
  const buildingPassword = rowData.col_6 || null; // Building Password (e.g., "#2580#")
  const apartmentPassword = rowData.col_7 || null; // Apartment Password (e.g., "199414#")

  // Combine unit reference and units if both exist
  let unitDisplay = unit;
  if (unit && units) {
    unitDisplay = `${unit}/${units}`;
  } else if (units) {
    unitDisplay = units;
  }

  // Return passwords as-is (no cleaning of # symbols)
  return {
    unit: unitDisplay,
    development: development,
    buildingPassword: buildingPassword,
    apartmentPassword: apartmentPassword
  };
}

/**
 * Call n8n webhook with JWT authentication
 * Sends form-urlencoded data as n8n expects
 * @param {string} url - n8n webhook URL
 * @param {object} data - Data to send to webhook (should have col_2 key)
 * @param {string} jwtToken - JWT token for authentication
 * @returns {Promise<object>} Result from webhook
 */
async function callN8nWebhook(url, data, jwtToken) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // Convert data to form-urlencoded format
      const formData = new URLSearchParams();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      const postData = formData.toString();

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      };

      // Add JWT token to Authorization header if provided
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: headers,
        timeout: 30000 // 30 second timeout
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsedData = JSON.parse(responseData);
              resolve({
                success: true,
                data: parsedData
              });
            } else {
              // Check for n8n webhook registration error
              let errorMessage = `Webhook returned status ${res.statusCode}`;
              let errorCode = 'WEBHOOK_ERROR';
              
              if (res.statusCode === 404) {
                // Check if it's the "webhook not registered" error
                if (responseData.includes('not registered') || responseData.includes('webhook')) {
                  errorMessage = `n8n webhook not found or not registered. The webhook URL may be incorrect or the workflow may not be active. Status: ${res.statusCode}`;
                  errorCode = 'WEBHOOK_NOT_REGISTERED';
                  
                  // Extract webhook ID from URL if possible
                  try {
                    const webhookIdMatch = url.match(/\/([a-f0-9-]{36})/);
                    if (webhookIdMatch) {
                      const webhookId = webhookIdMatch[1];
                      console.error(`❌ [n8n] Webhook ID "${webhookId}" is not registered in n8n`);
                      console.error(`❌ [n8n] Please check your N8N_UNIT_LOCK_WEBHOOK_URL environment variable`);
                      console.error(`❌ [n8n] Current URL: ${url}`);
                      console.error(`❌ [n8n] Response: ${responseData}`);
                      
                      // Check for common path issues
                      const urlPath = new URL(url).pathname;
                      if (urlPath.includes('/webhook/') && !urlPath.includes('/webhook-test/')) {
                        console.error(`⚠️ [n8n] Common issue detected: URL path might be missing '/webhook-test/'`);
                        console.error(`⚠️ [n8n] Expected format: https://<n8n-host>/webhook-test/<webhook-id>`);
                        console.error(`⚠️ [n8n] Your URL has: ${urlPath}`);
                      }
                    }
                  } catch (e) {
                    // Ignore extraction errors
                  }
                }
              }
              
              resolve({
                success: false,
                status: res.statusCode,
                error: errorMessage,
                code: errorCode,
                response: responseData
              });
            }
          } catch (parseError) {
            // If response is not JSON, return as text
            let errorMessage = parseError.message;
            let errorCode = 'WEBHOOK_ERROR';
            
            // Check if response text contains webhook error
            if (res.statusCode === 404 && responseData.includes('not registered')) {
              errorMessage = `n8n webhook not found or not registered. Response: ${responseData}`;
              errorCode = 'WEBHOOK_NOT_REGISTERED';
              console.error(`❌ [n8n] Webhook registration error. URL: ${url}`);
              console.error(`❌ [n8n] Response: ${responseData}`);
            }
            
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              data: responseData || null,
              error: errorMessage,
              code: errorCode
            });
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error calling n8n webhook:', error);
        resolve({
          success: false,
          error: error.message,
          code: 'WEBHOOK_CONNECTION_ERROR'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Webhook request timeout',
          code: 'WEBHOOK_TIMEOUT'
        });
      });

      req.write(postData);
      req.end();
    } catch (error) {
      console.error('Error preparing n8n webhook request:', error);
      resolve({
        success: false,
        error: error.message,
        code: 'WEBHOOK_ERROR'
      });
    }
  });
}

