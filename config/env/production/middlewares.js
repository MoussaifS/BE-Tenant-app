module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      trustProxy: true,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'storage.googleapis.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'storage.googleapis.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ['https://guest-nuzul.co', 'https://www.guest-nuzul.co', 'http://localhost:3000'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'proxy-protocol',
  {
    name: 'strapi::session',
    config: {
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
      },
    },
  },
  'strapi::favicon',
  'strapi::public',
];

