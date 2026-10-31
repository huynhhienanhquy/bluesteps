// Run after a fresh web export, with serve-preview.cjs on port 4173.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const targets = require('./fidelity-targets.cjs');
const root = path.resolve(__dirname, '../../..');
async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  const results = [];
  let runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  try {
    for (const target of targets) {
      runtimeErrors = [];
      let failure = null;
      try {
        await page.setViewportSize({ width: target.width ?? 428, height: target.height ?? 926 });
        await page.goto('http://127.0.0.1:4173' + target.route);
        const ready = target.readyTestId
          ? page.getByTestId(target.readyTestId)
          : target.readyButton
            ? page.getByRole('button', { name: target.readyButton, exact: true })
            : page.getByRole('heading', { name: new RegExp(target.heading) });
        await ready.first().waitFor({ timeout: 12000 });
        if (await page.getByRole('heading', { name: 'Không tìm thấy trang', exact: true }).count())
          throw new Error('Not-found route');
      } catch (error) {
        failure = error.message.slice(0, 700);
      }
      results.push({
        nodeId: target.nodeId,
        route: target.route,
        failure,
        runtimeErrors: [...runtimeErrors],
      });
      console.log(
        `${results.length}/${targets.length} ${target.nodeId}: ${failure || runtimeErrors.length ? 'FAIL' : 'OK'}`,
      );
    }
    const report = {
      checkedAt: new Date().toISOString(),
      scope:
        'Direct loading of saved frame routes; this is not proof of clickable reachability from Home.',
      checked: results.length,
      passed: results.filter((r) => !r.failure && !r.runtimeErrors.length).length,
      results,
    };
    fs.writeFileSync(
      path.join(root, 'docs/ui-progress-evidence-2026-10-31/navigation-runtime.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    if (report.passed !== report.checked) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
