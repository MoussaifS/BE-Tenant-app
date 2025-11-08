'use strict';

/**
 * unit-lock router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/unit-lock',
      handler: 'unit-lock.create',
      config: {
        auth: false, // Disable Strapi default auth - we use custom JWT validation in controller
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/unit-lock',
      handler: 'unit-lock.find',
      config: {
        auth: false, // Disable Strapi default auth - we use custom JWT validation in controller
        policies: [],
        middlewares: [],
      },
    },
  ],
};

