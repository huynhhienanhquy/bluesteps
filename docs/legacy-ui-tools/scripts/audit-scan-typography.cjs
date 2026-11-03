const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { PNG } = require('../../../node_modules/.pnpm/pngjs@3.4.0/node_modules/pngjs');
(async () => {
  const preview = spawn(process.execPath, [path.join(__dirname, 'serve-preview.cjs')], {
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
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch('http://127.0.0.1:4175')).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const page = await browser.newPage({ viewport: { width: 428, height: 926 } });
    const report = [];
    for (const mode of ['current', 'word-fallback', 'noto-paragraph']) {
      await page.goto('http://127.0.0.1:4175/scan?state=detail&preview=1');
      await page.getByRole('heading', { name: 'Kết quả quét rác', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(
        ({ mode, unsupported }) => {
          for (const node of document.querySelectorAll('[aria-label]')) {
            const label = node.getAttribute('aria-label');
            if (!label || !/Dấu hiệu:|Phân loại:|Xử lý:/.test(label) || node.textContent !== label)
              continue;
            if (mode === 'noto-paragraph') node.style.fontFamily = 'BackupNotoSans_400Regular';
            if (mode === 'word-fallback') {
              node.replaceChildren(
                ...label.split(/(\s+)/).map((word) => {
                  const span = document.createElement('span');
                  span.textContent = word;
                  span.style.fontFamily = [...word].some((char) => unsupported.includes(char))
                    ? 'BackupNotoSans_400Regular'
                    : 'Poppins_400Regular';
                  return span;
                }),
              );
            }
          }
        },
        {
          mode,
          unsupported: JSON.parse(
            fs.readFileSync(path.join(root, 'docs/figma-fidelity/poppins-cmap.json'), 'utf8'),
          ).unsupported,
        },
      );
      const file = path.join(root, `docs/figma-fidelity/rendered/scan-font-${mode}.png`);
      await page.screenshot({ path: file });
      const actual = PNG.sync.read(fs.readFileSync(file));
      const reference = PNG.sync.read(
        fs.readFileSync(path.join(root, 'docs/figma-fidelity/reference/386-14346.png')),
      );
      let difference = 0,
        count = 0;
      for (let y = 330; y < 580; y++)
        for (let x = 14; x < 414; x++)
          for (let c = 0; c < 3; c++) {
            const offset = (y * 428 + x) * 4 + c;
            difference += Math.abs(actual.data[offset] - reference.data[offset]);
            count++;
          }
      report.push({
        mode,
        meanAbsoluteChannelDifference: difference / count,
        comparisonRegion: [14, 330, 400, 250],
      });
    }
    fs.writeFileSync(
      path.join(root, 'docs/figma-fidelity/scan-typography-comparison.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
    preview.kill();
  }
})();
