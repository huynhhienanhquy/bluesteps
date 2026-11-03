const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { warmExpoBundles } = require('./expo-ready.cjs');

async function metro(context, failure) {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    if (request.url === '/status') return response.end('packager-status:running');
    const platform = request.headers['expo-platform'];
    if (request.url === '/') {
      if (failure === 'manifest') {
        response.writeHead(500);
        return response.end();
      }
      response.setHeader('Content-Type', 'application/json');
      return response.end(
        JSON.stringify({
          launchAsset: {
            url: `https://unreachable.invalid/entry.bundle?platform=${platform}&dev=true`,
          },
        }),
      );
    }
    if (failure === 'bundle') {
      response.writeHead(500);
      return response.end('Compilation failed');
    }
    response.end('compiled bundle');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return { url: `http://127.0.0.1:${server.address().port}`, requests };
}

test('warms both native bundles through loopback with the manifest path and query', async (context) => {
  const server = await metro(context);
  const results = await warmExpoBundles(server.url);
  assert.deepEqual(results, [
    { platform: 'android', bytes: 15 },
    { platform: 'ios', bytes: 15 },
  ]);
  assert(server.requests.includes('/entry.bundle?platform=android&dev=true'));
  assert(server.requests.includes('/entry.bundle?platform=ios&dev=true'));
});

for (const failure of ['manifest', 'bundle']) {
  test(`reports ${failure} errors instead of claiming the phone bundle is ready`, async (context) => {
    const server = await metro(context, failure);
    await assert.rejects(warmExpoBundles(server.url), /HTTP 500/);
  });
}
