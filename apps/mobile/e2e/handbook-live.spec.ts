import { expect, test } from '@playwright/test';

const api = process.env.BLUESTEPS_HANDBOOK_API;
test.skip(!api, 'Set BLUESTEPS_HANDBOOK_API to audit a running API with published handbook data.');
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  // Identity only unlocks navigation; all handbook GETs use the real public API.
  await page.route('**/v1/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 503, json: {} });
      return;
    }
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${api}${url.pathname}${url.search}`, headers: {} });
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'access-control-allow-origin': '*' },
    });
  });
  await page.route('**/v1/auth/web/refresh', (route) =>
    route.fulfill({ json: { accessToken: 'handbook-audit', sessionId: 'handbook-audit' } }),
  );
  await page.route('**/v1/me', (route) =>
    route.fulfill({ json: { id: 'handbook-audit', displayName: 'Kiểm tra sổ tay' } }),
  );
  await page.route('**/v1/me/preferences', (route) =>
    route.fulfill({ json: { theme: 'light', version: 1 } }),
  );
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' });
});

test('category handling remains readable in dark mode', async ({ page }) => {
  await page.route('**/v1/me/preferences', (route) =>
    route.fulfill({ json: { theme: 'dark', version: 1 } }),
  );
  await page.goto('/handbook/category/recycle?expanded=1');
  const text = page.getByText('Cách xử lý:', { exact: true });
  await expect(text).toHaveCSS('color', 'rgb(225, 243, 255)');
  const contrast = await text.evaluate((node) => {
    const rgb = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (color: string) =>
      rgb(color).reduce((sum, channel, index) => {
        const value = channel / 255;
        return (
          sum +
          (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index]!
        );
      }, 0);
    let parent: Element | null = node;
    while (
      parent &&
      ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(parent).backgroundColor)
    )
      parent = parent.parentElement;
    const foreground = luminance(getComputedStyle(node).color);
    const background = luminance(getComputedStyle(parent!).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  await page.screenshot({ path: 'test-results/handbook-dark-handling.png', fullPage: true });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('all category links, handling dialogs and material links work with published data', async ({
  page,
}) => {
  for (const [key, title] of [
    ['recycle', 'Rác tái chế'],
    ['organic', 'Rác hữu cơ'],
    ['inorganic', 'Rác vô cơ'],
  ]) {
    await page.goto('/handbook');
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/handbook/category/${key}$`));
    await page.getByRole('button', { name: `Cách xử lý ${title}`, exact: true }).click();
    await expect(page.getByText('Cách xử lý:', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng cách xử lý' }).click();
    const itemButtons = page.getByRole('button').filter({
      has: page.getByText(/Nhựa PET|Giấy carton|Nhôm|Hữu cơ|Túi ni lông|Pin|Dụng cụ y tế/, {
        exact: true,
      }),
    });
    await expect(itemButtons.first()).toBeVisible();
    const links = page.getByRole('button', { name: /^Tìm hiểu về / });
    const names = await links.allTextContents();
    for (const name of names) {
      await page.getByRole('button', { name: name.trim(), exact: true }).click();
      await expect(
        page
          .getByText('Chưa có vật phẩm trong sổ tay', { exact: true })
          .or(page.getByRole('heading', { name: /Các loại|Phân loại chất thải/ }))
          .or(
            page.getByRole('button', {
              name: /Chai nhựa|Giấy và hộp carton|Lon nhôm|Pin đã qua sử dụng/,
            }),
          )
          .first(),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    }
  }
});

test('every published waste detail loads and switches instructions', async ({ page, request }) => {
  const response = await request.get(`${api}/v1/waste-items?limit=100`);
  expect(response.ok()).toBeTruthy();
  const items = (await response.json()).items as { id: string; name: string }[];
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) {
    await page.goto(`/handbook/${item.id}`);
    await expect(page.getByRole('heading', { name: item.name, exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Hướng dẫn phân loại', exact: true }),
    ).toBeVisible();
    await page.getByRole('switch', { name: 'Xem điều không nên làm' }).click();
    await expect(page.getByRole('heading', { name: 'Không nên làm', exact: true })).toBeVisible();
    await page.getByRole('switch', { name: 'Xem điều không nên làm' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hướng dẫn phân loại', exact: true }),
    ).toBeVisible();
  }
});

test('material entry lookup, search and layout work on mobile widths', async ({ page }) => {
  await page.goto('/handbook');
  await page.getByRole('button', { name: 'Tìm hiểu về Nhựa', exact: true }).click();
  await page.getByRole('button', { name: 'Chi tiết PET', exact: true }).click();
  await page.getByRole('button', { name: 'Tra vật phẩm PET', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chai nhựa', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm vật phẩm', exact: true }).fill('khong-co-vat-pham');
  await expect(page.getByText('Chưa tìm thấy vật phẩm phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chai nhựa', exact: true })).toBeVisible();
  for (const width of [360, 390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/handbook');
    await expect(page.getByRole('button', { name: 'Rác tái chế', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `test-results/handbook-audit-${width}.png`, fullPage: true });
    await page.getByRole('textbox', { name: 'Tìm vật phẩm', exact: true }).fill('chai nhua');
    await expect(page.getByRole('button', { name: 'Chai nhựa', exact: true })).toBeVisible();
  }
});
