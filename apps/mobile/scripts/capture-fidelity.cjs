const { chromium } = require('@playwright/test');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const prefix = process.argv[2];
const targets = require('./fidelity-targets.cjs').filter(
  (target) => !prefix || target.name.startsWith(prefix),
);
const { spawn } = require('node:child_process');

(async () => {
  const output = resolve(__dirname, '../../../docs/figma-fidelity/rendered');
  mkdirSync(output, { recursive: true });
  const preview = spawn(process.execPath, [resolve(__dirname, 'serve-preview.cjs')], {
    env: { ...process.env, PORT: '4174' },
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
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        ready = (await fetch('http://127.0.0.1:4174')).ok;
      } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Local preview did not start on port 4174.');
    const page = await browser.newPage({
      viewport: { width: 428, height: 926 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const results = [];
    for (const { route: path, name, heading, readyButton, prepare, height = 926 } of targets) {
      for (const viewport of [
        { width: 428, height },
        { width: 390, height: 844 },
      ]) {
        console.log(`Capturing ${name} at ${viewport.width}`);
        await page.setViewportSize(viewport);
        await page.goto(`http://127.0.0.1:4174${path}`);
        if (readyButton)
          await page.getByRole('button', { name: readyButton, exact: true }).waitFor();
        else await page.getByRole('heading', { name: new RegExp(heading) }).waitFor();
        if (prepare === 'strong-password') {
          await page
            .getByRole('textbox', { name: 'Mật khẩu mới', exact: true })
            .fill('BlueSteps12!');
          await page
            .getByRole('textbox', { name: 'Xác nhận mật khẩu mới', exact: true })
            .fill('BlueSteps12!');
          await page.getByRole('heading', { name: new RegExp(heading) }).scrollIntoViewIfNeeded();
        }
        if (prepare === 'password-change') {
          await page
            .getByRole('textbox', { name: 'Mật khẩu hiện tại', exact: true })
            .fill('Previous123!');
          await page
            .getByRole('textbox', { name: 'Mật khẩu mới', exact: true })
            .fill('BlueSteps12!');
          await page
            .getByRole('textbox', { name: 'Xác nhận mật khẩu mới', exact: true })
            .fill('BlueSteps12!');
        }
        if (prepare) {
          await page.evaluate(() => {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          });
          await page.getByRole('heading', { name: new RegExp(heading) }).scrollIntoViewIfNeeded();
        }
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images, async (image) => {
              image.loading = 'eager';
              if (image.complete) return;
              await Promise.race([
                image.decode().catch(() => {}),
                new Promise((resolve) => setTimeout(resolve, 5000)),
              ]);
            }),
          );
        });
        await page.screenshot({
          path: resolve(output, `${name}-${viewport.width}.png`),
          animations: 'disabled',
        });
        results.push({
          path,
          viewport: `${viewport.width}x${viewport.height}`,
          images: await page.evaluate(() =>
            Array.from(document.images, (image) => {
              const bounds = image.getBoundingClientRect();
              return {
                src: image.currentSrc.split('/').pop(),
                loaded: image.complete && image.naturalWidth > 0,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
              };
            }),
          ),
          overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        });
      }
    }
    writeFileSync(
      resolve(output, prefix ? `capture-report-${prefix}.json` : 'capture-report.json'),
      JSON.stringify({ errors, results }, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          errors,
          screenshots: results.length,
          unloaded: results.flatMap((result) => result.images.filter((image) => !image.loaded)),
          overflow: results.filter((result) => result.overflow),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    preview.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
