const http = require('node:http');

// Development-only bridge through the Expo tunnel. The upstream is always loopback.
function createDevApiProxy(port = 8000) {
  return (request, response, next) => {
    const prefix = '/__bluesteps_api';
    if (!request.url?.startsWith(`${prefix}/`)) return next();
    const url = request.url.slice(prefix.length);
    if (!/^\/(v1(?:\/|\?|$)|health\/(live|ready)(?:\?|$))/.test(url)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const headers = { ...request.headers, host: `127.0.0.1:${port}` };
    delete headers['forwarded'];
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-proto'];
    const upstream = http.request(
      { hostname: '127.0.0.1', port, path: url, method: request.method, headers },
      (reply) => {
        response.writeHead(reply.statusCode, reply.headers);
        reply.pipe(response);
      },
    );
    upstream.setTimeout(30_000, () => upstream.destroy());
    upstream.on('error', () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(
        JSON.stringify({
          error: {
            code: 'DEV_API_UNAVAILABLE',
            message: 'Backend phát triển chưa kết nối được.',
            retryable: true,
          },
        }),
      );
    });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => {
      if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
  };
}
module.exports = { createDevApiProxy };
