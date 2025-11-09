export default ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env("PORT", 1337),
  app: {
    keys: env.array("APP_KEYS"),
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", true),
  },
  url: env("STRAPI_ADMIN_URL", ""),
});