const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createDevApiProxy } = require('./dev-api-proxy.cjs');

async function serve(handler, context) {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return { port: server.address().port, url: `http://127.0.0.1:${server.address().port}` };
}
test('native API commands retain path, query, auth, idempotency key, body and error status', async (context) => {
  const upstream = await serve(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    response.writeHead(409, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        url: request.url,
        method: request.method,
        authorization: request.headers.authorization,
        key: request.headers['idempotency-key'],
        body,
      }),
    );
  }, context);
  const proxy = createDevApiProxy(upstream.port);
  const server = await serve(
    (req, res) =>
      proxy(req, res, () => {
        res.writeHead(418);
        res.end();
      }),
    context,
  );
  const response = await fetch(server.url + '/__bluesteps_api/v1/routes?source=phone', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Idempotency-Key': 'same-operation' },
    body: '{"stopIds":[]}',
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    url: '/v1/routes?source=phone',
    method: 'POST',
    authorization: 'Bearer test-token',
    key: 'same-operation',
    body: '{"stopIds":[]}',
  });
});
test('Metro requests pass through and proxy does not expose arbitrary upstream paths', async (context) => {
  let requests = 0;
  const upstream = await serve((req, res) => {
    requests++;
    res.end('unexpected');
  }, context);
  const proxy = createDevApiProxy(upstream.port);
  const server = await serve(
    (req, res) =>
      proxy(req, res, () => {
        res.writeHead(418);
        res.end();
      }),
    context,
  );
  assert.equal((await fetch(server.url + '/status')).status, 418);
  assert.equal((await fetch(server.url + '/__bluesteps_api/docs')).status, 404);
  assert.equal((await fetch(server.url + '/__bluesteps_api/http://example.com')).status, 404);
  assert.equal(requests, 0);
});
test('an unavailable local API returns an honest retryable service error', async (context) => {
  const proxy = createDevApiProxy(0);
  const server = await serve((req, res) => proxy(req, res, () => res.end()), context);
  const response = await fetch(server.url + '/__bluesteps_api/health/ready');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'DEV_API_UNAVAILABLE');
});
