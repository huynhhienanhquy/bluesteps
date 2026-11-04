const { setTimeout: delay } = require('node:timers/promises');
const { isIP } = require('node:net');

const transientCodes = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

function isTransient(error) {
  if (!error || typeof error !== 'object') return false;
  if (transientCodes.has(error.code) || ['AbortError', 'TimeoutError'].includes(error.name))
    return true;
  if (error.cause) return isTransient(error.cause);
  return Array.isArray(error.errors) && error.errors.length > 0 && error.errors.every(isTransient);
}

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

// Compile through loopback: a cold build can exceed the public tunnel's timeout.
async function warmExpoBundles(baseUrl = 'http://127.0.0.1:8081', options = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryDelayMs = options.retryDelayMs ?? 750;
  const onRetry = options.onRetry ?? console.warn;
  async function request(url, init, label, timeoutMs, consume) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response;
      try {
        response = await fetch(url, {
          ...init,
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new HttpError(response.status);
        return await consume(response);
      } catch (error) {
        await response?.body?.cancel().catch(() => {});
        const retryable =
          isTransient(error) || (error instanceof HttpError && error.status === 503);
        if (!retryable || attempt === maxAttempts) {
          const code = error.code ?? error.cause?.code;
          throw new Error(
            `${label}: ${error.message}${code ? ` (${code})` : ''}. ` +
              (error instanceof HttpError && error.status !== 503
                ? 'Kiểm tra lỗi Metro trong terminal.'
                : `Không tải được sau ${attempt} lần thử.`),
            { cause: error },
          );
        }
        onRetry(`${label}: kết nối tạm gián đoạn, đang thử lại (${attempt + 1}/${maxAttempts}).`);
        await delay(retryDelayMs * attempt);
      }
    }
  }

  let ready = false;
  let readinessError;
  for (let attempt = 0; attempt < (options.readyAttempts ?? 120); attempt++) {
    try {
      const response = await fetch(`${baseUrl}/status`, {
        redirect: 'error',
        signal: AbortSignal.timeout(options.readyTimeoutMs ?? 1500),
      });
      if (response.ok && (await response.text()) === 'packager-status:running') {
        ready = true;
        break;
      }
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      readinessError = error;
      // Metro and the tunnel are still starting.
    }
    await delay(options.readyDelayMs ?? 500);
  }
  if (!ready)
    throw new Error('Metro localhost chưa sẵn sàng để chuẩn bị bundle Android/iOS.', {
      cause: readinessError,
    });

  const results = [];
  // Metro has two workers on this laptop; warm one platform at a time to avoid
  // competing cold builds and keep a failed download from cancelling the other.
  for (const platform of ['android', 'ios']) {
    const source = await request(
      `${baseUrl}/`,
      { headers: { 'expo-platform': platform, accept: 'application/expo+json' } },
      `Manifest ${platform}`,
      options.manifestTimeoutMs ?? 30_000,
      async (response) => new URL((await response.json()).launchAsset.url),
    );
    const localBundle = new URL(baseUrl);
    localBundle.pathname = source.pathname;
    localBundle.search = source.search;
    const bytes = await request(
      localBundle,
      {},
      `Bundle ${platform}`,
      options.bundleTimeoutMs ?? 180_000,
      async (response) => {
        let bytes = 0;
        for await (const chunk of response.body) bytes += chunk.length;
        return bytes;
      },
    );
    results.push({ platform, bytes });
  }
  return results;
}

function publicTunnelOrigin(source) {
  const hostname = source.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (
    !['http:', 'https:'].includes(source.protocol) ||
    source.username ||
    source.password ||
    isIP(hostname) ||
    !hostname.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal|lan|invalid|test)$/.test(hostname)
  )
    return null;
  // Local manifest requests can advertise HTTP even after the public tunnel is
  // connected. Phone readiness is checked against standard HTTPS by the caller.
  return `https://${hostname}`;
}

async function waitExpoTunnel(baseUrl = 'http://127.0.0.1:8081', options = {}) {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const deadline = Date.now() + timeoutMs;
  let lastError;
  let lastState = 'Manifest vẫn dùng localhost/LAN.';
  while (Date.now() < deadline) {
    let origin;
    let pending = false;
    for (const platform of ['android', 'ios']) {
      let response;
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          pending = true;
          break;
        }
        response = await fetch(`${baseUrl}/`, {
          headers: { 'expo-platform': platform, accept: 'application/expo+json' },
          redirect: 'error',
          signal: AbortSignal.timeout(Math.min(options.requestTimeoutMs ?? 5000, remaining)),
        });
        if (!response.ok) throw new HttpError(response.status);
        const source = new URL((await response.json()).launchAsset.url);
        const next = publicTunnelOrigin(source);
        if (!next || (origin && origin !== next)) {
          pending = true;
          lastError = undefined;
          lastState = `Manifest ${platform} chưa có cùng địa chỉ tunnel công khai.`;
          break;
        }
        origin = next;
      } catch (error) {
        await response?.body?.cancel().catch(() => {});
        lastError = error;
        lastState = `Manifest ${platform}: ${error.message}.`;
        if (!isTransient(error) && !(error instanceof HttpError && error.status === 503))
          throw new Error(`Chờ tunnel HTTPS — ${lastState} Kiểm tra lỗi Metro trong terminal.`, {
            cause: error,
          });
        pending = true;
        break;
      }
    }
    if (!pending && origin) return origin;
    await delay(Math.max(0, Math.min(options.pollDelayMs ?? 1000, deadline - Date.now())));
  }
  throw new Error(
    `Tunnel HTTPS chưa sẵn sàng sau ${Math.ceil(timeoutMs / 1000)} giây. ${lastState}`,
    { cause: lastError },
  );
}

module.exports = { warmExpoBundles, waitExpoTunnel };
