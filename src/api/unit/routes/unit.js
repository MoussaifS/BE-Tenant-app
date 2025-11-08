'use strict';

/**
 * unit router
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/units/by-accommodation',
      handler: 'unit.findByAccommodation',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/units',
      handler: 'unit.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/units/:id',
      handler: 'unit.findOne',
      config: {
        auth: false,
      },
    },
  ],
};
