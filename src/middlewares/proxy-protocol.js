module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Ensure protocol is detected from proxy headers for Google App Engine
    const forwardedProto = ctx.request.header['x-forwarded-proto'];
    if (forwardedProto === 'https') {
      ctx.request.protocol = 'https';
      ctx.request.secure = true;
    }
    await next();
  };
};

