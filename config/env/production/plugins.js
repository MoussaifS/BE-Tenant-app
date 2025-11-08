module.exports = ({ env }) => {
  return {
    upload: {
      config: {
        provider: '@strapi-community/strapi-provider-upload-google-cloud-storage',
        providerOptions: {
          bucketName: env('GCS_BUCKET_NAME'),
          publicFiles: true,
          basePath: env('GCS_BASE_PATH'),
          uniform: true,
        },
      },
    },
  };
};