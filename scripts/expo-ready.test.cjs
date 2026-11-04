const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { warmExpoBundles, waitExpoTunnel } = require('./expo-ready.cjs');

const fast = {
  readyAttempts: 3,
  readyDelayMs: 1,
  retryDelayMs: 1,
  readyTimeoutMs: 1000,
  manifestTimeoutMs: 1000,
  bundleTimeoutMs: 1000,
  onRetry() {},
};

async function serve(handler, context) {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function normalResponse(request, response) {
  if (request.url === '/status') return response.end('packager-status:running');
  if (request.url === '/') {
    const platform = request.headers['expo-platform'];
    response.setHeader('Content-Type', 'application/json');
    return response.end(
      JSON.stringify({
        launchAsset: {
          url: `https://unused-tunnel.invalid/expo-router/entry.bundle?platform=${platform}&dev=true&transform.engine=hermes`,
        },
      }),
    );
  }
  const platform = new URL(request.url, 'http://localhost').searchParams.get('platform');
  response.end(`${platform} bundle`);
}

test('warms Android then iOS entirely on loopback, retaining bundle path and query', async (context) => {
  const observed = [];
  const url = await serve((request, response) => {
    observed.push({ url: request.url, platform: request.headers['expo-platform'] });
    normalResponse(request, response);
  }, context);
  assert.deepEqual(await warmExpoBundles(url, fast), [
    { platform: 'android', bytes: Buffer.byteLength('android bundle') },
    { platform: 'ios', bytes: Buffer.byteLength('ios bundle') },
  ]);
  assert.deepEqual(observed, [
    { url: '/status', platform: undefined },
    { url: '/', platform: 'android' },
    {
      url: '/expo-router/entry.bundle?platform=android&dev=true&transform.engine=hermes',
      platform: undefined,
    },
    { url: '/', platform: 'ios' },
    {
      url: '/expo-router/entry.bundle?platform=ios&dev=true&transform.engine=hermes',
      platform: undefined,
    },
  ]);
});

for (const stage of ['Manifest', 'Bundle']) {
  for (const failure of ['503', 'interrupted body']) {
    test(`recovers from ${stage} ${failure} and still completes both platforms`, async (context) => {
      let attempts = 0;
      const retries = [];
      const url = await serve((request, response) => {
        const targeted =
          stage === 'Manifest'
            ? request.url === '/' && request.headers['expo-platform'] === 'android'
            : request.url.includes('platform=android');
        if (targeted && ++attempts === 1) {
          if (failure === '503') {
            response.writeHead(503);
            return response.end('temporarily unavailable');
          }
          response.writeHead(200, { 'Content-Length': 500 });
          response.write('partial');
          setTimeout(() => response.destroy(), 5);
          return;
        }
        normalResponse(request, response);
      }, context);
      const result = await warmExpoBundles(url, {
        ...fast,
        onRetry: (message) => retries.push(message),
      });
      assert.deepEqual(
        result.map((item) => item.platform),
        ['android', 'ios'],
      );
      assert.equal(attempts, 2);
      assert.equal(retries.length, 1);
      assert.match(retries[0], new RegExp(`${stage} android`));
      assert.equal(result[0].bytes, Buffer.byteLength('android bundle'));
    });
  }
}

test('retries an actual manifest header timeout and cancels the abandoned request', async (context) => {
  let attempts = 0;
  let closed = false;
  const url = await serve((request, response) => {
    if (request.url === '/' && request.headers['expo-platform'] === 'android' && ++attempts === 1) {
      request.on('close', () => {
        closed = true;
      });
      return;
    }
    normalResponse(request, response);
  }, context);
  assert.equal((await warmExpoBundles(url, { ...fast, manifestTimeoutMs: 100 })).length, 2);
  assert.equal(attempts, 2);
  assert.equal(closed, true);
});

test('retries the nested AggregateError ETIMEDOUT reported by Node before warming both bundles', async (context) => {
  const url = await serve(normalResponse, context);
  const transport = globalThis.fetch;
  let failed = false;
  context.mock.method(globalThis, 'fetch', async (input, options) => {
    if (String(input) === `${url}/` && !failed) {
      failed = true;
      const timeout = Object.assign(new Error('connection timed out'), { code: 'ETIMEDOUT' });
      throw new TypeError('fetch failed', { cause: new AggregateError([timeout]) });
    }
    return transport(input, options);
  });
  assert.equal((await warmExpoBundles(url, fast)).length, 2);
  assert.equal(failed, true);
});

test('certificate failures are reported immediately rather than retried', async (context) => {
  const url = await serve(normalResponse, context);
  const transport = globalThis.fetch;
  let attempts = 0;
  context.mock.method(globalThis, 'fetch', async (input, options) => {
    if (String(input) === `${url}/`) {
      attempts++;
      const certificate = Object.assign(new Error('invalid certificate'), {
        code: 'CERT_HAS_EXPIRED',
      });
      throw new TypeError('fetch failed', { cause: certificate });
    }
    return transport(input, options);
  });
  await assert.rejects(warmExpoBundles(url, fast), /Manifest android:.*CERT_HAS_EXPIRED/);
  assert.equal(attempts, 1);
});

for (const status of [400, 500]) {
  test(`does not retry Metro compilation HTTP ${status}`, async (context) => {
    let attempts = 0;
    let retries = 0;
    const url = await serve((request, response) => {
      if (request.url.includes('.bundle')) {
        attempts++;
        response.writeHead(status);
        return response.end('Unable to resolve module');
      }
      normalResponse(request, response);
    }, context);
    await assert.rejects(
      warmExpoBundles(url, { ...fast, onRetry: () => retries++ }),
      new RegExp(`Bundle android: HTTP ${status}.*Metro`),
    );
    assert.equal(attempts, 1);
    assert.equal(retries, 0);
  });
}

test('invalid manifest data fails at its own stage without retrying', async (context) => {
  let attempts = 0;
  const url = await serve((request, response) => {
    if (request.url === '/') {
      attempts++;
      return response.end('{bad json');
    }
    normalResponse(request, response);
  }, context);
  await assert.rejects(warmExpoBundles(url, fast), /Manifest android:/);
  assert.equal(attempts, 1);
});

test('redirects cannot send loopback warmup requests to an external origin', async (context) => {
  let redirectedRequests = 0;
  const other = await serve((request, response) => {
    redirectedRequests++;
    response.end('unexpected');
  }, context);
  const url = await serve((request, response) => {
    if (request.url === '/') {
      response.writeHead(302, { Location: other });
      return response.end();
    }
    normalResponse(request, response);
  }, context);
  await assert.rejects(warmExpoBundles(url, fast), /Manifest android:/);
  assert.equal(redirectedRequests, 0);
});

test('exhausted body timeouts identify the platform and stop after the retry limit', async (context) => {
  let attempts = 0;
  const url = await serve((request, response) => {
    if (request.url.includes('platform=ios')) {
      attempts++;
      response.writeHead(200);
      response.write('incomplete bundle');
      return;
    }
    normalResponse(request, response);
  }, context);
  await assert.rejects(
    warmExpoBundles(url, { ...fast, maxAttempts: 2, bundleTimeoutMs: 100 }),
    /Bundle ios:.*sau 2 lần thử/,
  );
  assert.equal(attempts, 2);
});

test('readiness polling is bounded and does not request manifests prematurely', async (context) => {
  const paths = [];
  const url = await serve((request, response) => {
    paths.push(request.url);
    response.writeHead(503);
    response.end();
  }, context);
  await assert.rejects(warmExpoBundles(url, { ...fast, readyAttempts: 2 }), /Metro localhost/);
  assert.deepEqual(paths, ['/status', '/status']);
});

const tunnelFast = { timeoutMs: 1000, requestTimeoutMs: 100, pollDelayMs: 1 };

function manifest(response, origin) {
  response.end(JSON.stringify({ launchAsset: { url: `${origin}/entry.bundle?platform=ios` } }));
}

test('waits for actual public tunnel authority rather than local or private fallback manifests', async (context) => {
  const fallbacks = [
    'http://localhost:8081',
    'https://127.0.0.1:8081',
    'https://[::1]:8081',
    'https://192.168.1.12:8081',
    'https://10.0.0.12:8081',
    'https://172.16.0.12:8081',
    'https://computer.local:8081',
    'https://computer.lan:8081',
  ];
  const requests = [];
  const url = await serve((request, response) => {
    requests.push(request.headers['expo-platform']);
    assert.equal(request.url, '/');
    assert.equal(request.headers.accept, 'application/expo+json');
    manifest(response, fallbacks.shift() ?? 'https://current.on.expo.app');
  }, context);
  assert.equal(await waitExpoTunnel(url, tunnelFast), 'https://current.on.expo.app');
  assert.deepEqual(requests.slice(-2), ['android', 'ios']);
  assert.equal(requests.length, 10);
});

test('normalizes an HTTP public tunnel manifest to standard HTTPS without fetching that URL', async (context) => {
  const requests = [];
  const url = await serve((request, response) => {
    requests.push(request.url);
    manifest(response, 'http://current.exp.direct:80');
  }, context);
  assert.equal(await waitExpoTunnel(url, tunnelFast), 'https://current.exp.direct');
  assert.deepEqual(requests, ['/', '/']);
});

test('waits for Android and iOS manifests to agree on the current tunnel', async (context) => {
  let iosAttempts = 0;
  const url = await serve((request, response) => {
    const oldIos = request.headers['expo-platform'] === 'ios' && ++iosAttempts === 1;
    manifest(response, oldIos ? 'https://old.ngrok-free.app' : 'https://current.on.expo.app');
  }, context);
  assert.equal(await waitExpoTunnel(url, tunnelFast), 'https://current.on.expo.app');
  assert.equal(iosAttempts, 2);
});

test('tunnel polling recovers from temporary HTTP 503 and an interrupted manifest body', async (context) => {
  let attempts = 0;
  const url = await serve((request, response) => {
    attempts++;
    if (attempts === 1) {
      response.writeHead(503);
      return response.end('starting');
    }
    if (attempts === 2) {
      response.writeHead(200, { 'Content-Length': 500 });
      response.write('partial');
      setTimeout(() => response.destroy(), 5);
      return;
    }
    manifest(response, 'https://current.on.expo.app');
  }, context);
  assert.equal(await waitExpoTunnel(url, tunnelFast), 'https://current.on.expo.app');
  assert.equal(attempts, 4);
});

for (const status of [400, 500]) {
  test(`tunnel polling does not hide manifest HTTP ${status}`, async (context) => {
    let attempts = 0;
    const url = await serve((request, response) => {
      attempts++;
      response.writeHead(status);
      response.end('invalid project');
    }, context);
    await assert.rejects(
      waitExpoTunnel(url, tunnelFast),
      new RegExp(`Manifest android: HTTP ${status}`),
    );
    assert.equal(attempts, 1);
  });
}

test('a permanently local fallback never counts as a ready public tunnel', async (context) => {
  const url = await serve(
    (request, response) => manifest(response, 'http://192.168.1.12:8081'),
    context,
  );
  await assert.rejects(
    waitExpoTunnel(url, { ...tunnelFast, timeoutMs: 50 }),
    /Tunnel HTTPS chưa sẵn sàng/,
  );
});

test('tunnel polling caps header timeouts within the total wait limit', async (context) => {
  let attempts = 0;
  const url = await serve(() => {
    attempts++;
  }, context);
  const started = Date.now();
  await assert.rejects(
    waitExpoTunnel(url, { ...tunnelFast, timeoutMs: 120, requestTimeoutMs: 30 }),
    /Tunnel HTTPS chưa sẵn sàng.*Manifest android/,
  );
  assert.ok(Date.now() - started < 1000);
  assert.ok(attempts >= 2);
});
