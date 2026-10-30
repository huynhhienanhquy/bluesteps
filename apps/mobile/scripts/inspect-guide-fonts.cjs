const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

(async () => {
  const preview = spawn(process.execPath, [resolve(__dirname, 'serve-preview.cjs')], {
    env: { ...process.env, PORT: '4175' },
    stdio: 'ignore',
    windowsHide: true,
  });
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        if ((await fetch('http://127.0.0.1:4175')).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const page = await browser.newPage({ viewport: { width: 428, height: 926 } });
    await page.goto('http://127.0.0.1:4175/handbook/plastic');
    await page.getByRole('heading', { name: 'Đồ nhựa', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const locator = page.getByLabel(/^Bỏ các vật dụng nhựa sạch/);
    await locator.evaluate((node) => (node.id = 'font-audit'));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#font-audit',
    });
    const report = {
      route: '/handbook/plastic',
      headingMetrics: await page.evaluate(() => {
        const context = document.createElement('canvas').getContext('2d');
        return ['Inter_700Bold', 'BackupInter_700Bold'].map((family) => {
          context.font = `32px ${family}`;
          return { family, text: 'GreenSteps', width: context.measureText('GreenSteps').width };
        });
      }),
      ...(await locator.evaluate((node) => ({
        font: getComputedStyle(node).font,
        width: node.clientWidth,
      }))),
      ...(await cdp.send('CSS.getPlatformFontsForNode', { nodeId })),
    };
    writeFileSync(
      resolve(__dirname, '../../../docs/figma-fidelity/guide-font-audit.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    preview.kill();
  }
})();
