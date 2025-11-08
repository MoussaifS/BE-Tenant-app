'use strict';

/**
 * auth controller
 */

const jwt = require('jsonwebtoken');

module.exports = {
  async authenticate(ctx) {
    try {
      const { bookingReference } = ctx.request.body;

      if (!bookingReference) {
        ctx.status = 400;
        ctx.body = {
          error: 'Booking reference is required',
          code: 'MISSING_REFERENCE'
        };
        return;
      }

      // Find booking by reference number
      const booking = await strapi.entityService.findMany('api::booking.booking', {
        filters: {
          Booking_Reference_Number: bookingReference
        },
        populate: '*'
      });

      if (!booking || booking.length === 0) {
        ctx.status = 404;
        ctx.body = {
          error: 'Invalid booking reference. Please check your booking confirmation.',
          code: 'INVALID_REFERENCE'
        };
        return;
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
        ctx.status = 403;
        ctx.body = {
          error: `Your access begins on ${arrivalDate.toLocaleDateString()} at 3:45 PM. Please check in after this time.`,
          code: 'TOO_EARLY',
          arrivalTime: arrivalTime.toISOString()
        };
        return;
      }

      // Check if too late (after departure at 12:00 PM)
      if (now > departureTime) {
        ctx.status = 403;
        ctx.body = {
          error: 'Your booking period has ended. If you need assistance, please contact support.',
          code: 'TOO_LATE',
          departureTime: departureTime.toISOString()
        };
        return;
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
      ctx.status = 200;
      ctx.body = {
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
      };

    } catch (error) {
      console.error('Authentication error:', error);
      ctx.status = 500;
      ctx.body = {
        error: 'An error occurred during authentication. Please try again.',
        code: 'SERVER_ERROR'
      };
    }
  }
};