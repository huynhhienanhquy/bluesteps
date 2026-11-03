const { getDefaultConfig } = require('expo/metro-config');
const { createDevApiProxy } = require('./scripts/dev-api-proxy.cjs');

const config = getDefaultConfig(__dirname);
// Keep native QA and exports within the memory available on a developer laptop.
config.maxWorkers = 2;
if (process.env.BLUESTEPS_DEV_API_PROXY === '1') {
  const proxy = createDevApiProxy();
  config.server.enhanceMiddleware = (metro) => (request, response, next) =>
    proxy(request, response, () => metro(request, response, next));
}
module.exports = config;
