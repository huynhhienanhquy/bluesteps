const { chromium, expect } = require('../../apps/mobile/node_modules/@playwright/test');
const fs = require('node:fs');
(async () => {
  const directory = __dirname + '/rewards-visual';
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const viewport of [{ width: 428, height: 926 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const [name, route] of [['journey', '/rewards'], ['catalog', '/rewards/catalog'], ['history', '/history'], ['guide', '/rewards/guide']]) {
      const sessionReady = page.waitForResponse(response => response.url().endsWith('/v1/auth/web/refresh'), { timeout: 15000 });
      const catalogReady = name === 'catalog' ? page.waitForResponse(response => /\/v1\/rewards\?/.test(response.url()), { timeout: 15000 }) : null;
      await page.goto('http://127.0.0.1:4173' + route);
      await sessionReady;
      if (catalogReady) await catalogReady;
      await page.getByRole('heading').first().waitFor();
      await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
      await expect(page.getByText('Đang tải dữ liệu…', { exact: true })).toHaveCount(0, { timeout: 15000 });
      const check = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, images: Array.from(document.images).map(image => ({ url: image.src.split('/').pop(), width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height, valid: image.naturalWidth > 0 })) }));
      if (check.scrollWidth > check.width) throw new Error(`${name} overflows`);
      await page.screenshot({ path: `${directory}/${name}-${viewport.width}.png` });
      results.push({ name, route, viewport, ...check });
    }
  }
  fs.writeFileSync(`${directory}/checks.json`, JSON.stringify({ errors, results, state: 'guest; normal configured API, no fake data' }, null, 2));
  console.log(JSON.stringify({ errors, screens: results.length }));
  await browser.close();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
