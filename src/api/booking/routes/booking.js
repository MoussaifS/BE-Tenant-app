'use strict';

/**
 * booking router
 */

module.exports = {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/bookings',
      handler: 'booking.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/bookings/:id',
      handler: 'booking.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings',
      handler: 'booking.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/bookings/:id',
      handler: 'booking.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/bookings/:id',
      handler: 'booking.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Custom route for n8n integration
    {
      method: 'POST',
      path: '/bookings/create-from-n8n',
      handler: 'booking.createFromN8n',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Custom authentication route
    {
      method: 'POST',
      path: '/bookings/authenticate',
      handler: 'booking.authenticate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};