'use strict';

/**
 * request router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/requests',
      handler: 'request.create',
      config: {
        auth: false, // Disable Strapi default auth - we use custom JWT validation in controller
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/requests',
      handler: 'request.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/requests/:id',
      handler: 'request.findOne',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/requests/:id',
      handler: 'request.update',
      config: {
        auth: false,
      },
    },
    {
      method: 'DELETE',
      path: '/requests/:id',
      handler: 'request.delete',
      config: {
        auth: false,
      },
    },
  ],
};
