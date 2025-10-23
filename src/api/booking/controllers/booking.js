'use strict';

/**
 * booking controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::booking.booking', ({ strapi }) => ({
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

      // Set specific times: 3:45 PM for arrival, 12:00 PM for departure
      const arrivalTime = new Date(arrivalDate);
      arrivalTime.setHours(15, 45, 0, 0); // 3:45 PM

      const departureTime = new Date(departureDate);
      departureTime.setHours(12, 0, 0, 0); // 12:00 PM

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
