module.exports = ({ config }) => ({
  ...config,
  extra: { ...config.extra, devApiProxy: process.env.BLUESTEPS_DEV_API_PROXY === '1' },
});
