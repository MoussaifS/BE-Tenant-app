'use strict';

/**
 * unit controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::unit.unit', ({ strapi }) => ({
  // Custom method to get unit by accommodation with JWT validation
  async findByAccommodation(ctx) {
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

      // Get accommodation from token payload or request
      // decoded is either string or JwtPayload (object)
      const tokenAccommodation = typeof decoded === 'object' && decoded !== null ? decoded.accommodation : null;
      const accommodation = ctx.request.query.accommodation || tokenAccommodation;
      
      if (!accommodation) {
        ctx.status = 400;
        ctx.body = {
          error: 'Accommodation is required',
          code: 'MISSING_ACCOMMODATION'
        };
        return;
      }

      // Extract unit reference from accommodation (e.g., "Alaredh R217" -> "R217")
      const unitMatch = accommodation.match(/R(\d+)/);
      if (!unitMatch) {
        ctx.status = 400;
        ctx.body = {
          error: 'Invalid accommodation format',
          code: 'INVALID_ACCOMMODATION_FORMAT'
        };
        return;
      }

      const unitReference = `R${unitMatch[1]}`;

      // Find unit by reference
      const units = await strapi.entityService.findMany('api::unit.unit', {
        filters: {
          Reference: unitReference
        }
      });

      if (!units || units.length === 0) {
        ctx.status = 404;
        ctx.body = {
          error: 'Unit not found',
          code: 'UNIT_NOT_FOUND'
        };
        return;
      }

      // Return the unit
      ctx.status = 200;
      ctx.body = {
        data: units[0]
      };
    } catch (error) {
      console.error('Error fetching unit:', error);
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      };
    }
  }
}));
