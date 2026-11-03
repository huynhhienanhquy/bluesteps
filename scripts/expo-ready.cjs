const { setTimeout: delay } = require('node:timers/promises');

// Compile through loopback: a cold build can exceed the public tunnel's timeout.
async function warmExpoBundles(baseUrl = 'http://127.0.0.1:8081') {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await response.text()) === 'packager-status:running') {
        ready = true;
        break;
      }
    } catch {
      // Metro and the tunnel are still starting.
    }
    await delay(500);
  }
  if (!ready) throw new Error('Metro chưa sẵn sàng để chuẩn bị bundle điện thoại.');

  return Promise.all(
    ['android', 'ios'].map(async (platform) => {
      const response = await fetch(`${baseUrl}/`, {
        headers: { 'expo-platform': platform, accept: 'application/expo+json' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Manifest ${platform}: HTTP ${response.status}.`);
      const manifest = await response.json();
      const source = new URL(manifest.launchAsset.url);
      const localBundle = new URL(baseUrl);
      localBundle.pathname = source.pathname;
      localBundle.search = source.search;
      const bundle = await fetch(localBundle, { signal: AbortSignal.timeout(180_000) });
      if (!bundle.ok) {
        await bundle.body?.cancel();
        throw new Error(
          `Bundle ${platform}: HTTP ${bundle.status}. Kiểm tra lỗi Metro trong terminal.`,
        );
      }
      let bytes = 0;
      for await (const chunk of bundle.body) bytes += chunk.length;
      return { platform, bytes };
    }),
  );
}

module.exports = { warmExpoBundles };
