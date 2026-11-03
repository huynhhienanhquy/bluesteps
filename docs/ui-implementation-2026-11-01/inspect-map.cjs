const { chromium } = require('../../apps/mobile/node_modules/@playwright/test');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 428, height: 926 } });
  const requests = [];
  page.on('requestfailed', request => { if (/openstreetmap/.test(request.url())) requests.push({ failed: request.failure()?.errorText, url: request.url() }); });
  page.on('response', response => { if (/openstreetmap/.test(response.url())) requests.push({ status: response.status(), url: response.url() }); });
  const providerOnly = process.argv.includes('--provider-only');
  await page.goto(providerOnly ? 'https://www.openstreetmap.org/export/embed.html?bbox=106.68%2C10.76%2C106.71%2C10.79&layer=mapnik&marker=10.775%2C106.695' : 'http://127.0.0.1:4173/collection');
  try { if (providerOnly) await page.locator('canvas').first().waitFor({ timeout: 25000 }); else { await page.locator('iframe').waitFor({ timeout: 15000 }); await page.frameLocator('iframe').locator('canvas').first().waitFor({ timeout: 25000 }); } } catch (error) { requests.push({ mapReady: false, reason: error.message.split('\n')[0] }); }
  const frame = providerOnly ? page.mainFrame() : page.frames().find(frame => /openstreetmap/.test(frame.url()));
  const details = { requests, frame: frame?.url(), text: frame ? (await frame.locator('body').innerText()).slice(0, 600) : null, geometry: await page.locator('iframe').boundingBox().catch(() => null) };
  fs.writeFileSync(__dirname + '/map-provider-check.json', JSON.stringify(details, null, 2));
  await page.screenshot({ path: __dirname + '/map-provider-check.png' });
  console.log(JSON.stringify(details));
  await browser.close();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
