'use strict';

/**
 * auth router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/authenticate',
      handler: 'auth.authenticate',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};