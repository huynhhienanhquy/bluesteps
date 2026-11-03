import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  // Restore a local test account; gameplay itself needs no game server.
  await page.route('**/v1/**', (route) => route.fulfill({ status: 503, json: {} }));
  await page.route('**/v1/auth/web/refresh', (route) =>
    route.fulfill({ json: { accessToken: 'test-session', sessionId: 'test-session' } }),
  );
  await page.route('**/v1/me', (route) =>
    route.fulfill({ json: { id: 'memory-player', displayName: 'Người chơi' } }),
  );
  await page.route('**/v1/me/preferences', (route) =>
    route.fulfill({ json: { theme: 'light', version: 1 } }),
  );
});

test('the sample game is discoverable, playable to completion and replayable', async ({ page }) => {
  await page.goto('/game');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm trò chơi' }).fill('Lật thẻ xanh');
  await page.getByRole('button', { name: 'Lật thẻ xanh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cách chơi' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu lật thẻ' }).click();
  await expect(page.getByText('Đã ghép 0/6 cặp', { exact: true })).toBeVisible();
  const positions = new Map<string, number[]>();
  let first: { index: number; name: string } | undefined;
  for (let index = 0; index < 12; index++) {
    const card = page.getByRole('button', { name: new RegExp(`^Thẻ ${index + 1},`) });
    if ((await card.getAttribute('aria-label'))!.includes('đã ghép')) continue;
    await card.click();
    const label = (await card.getAttribute('aria-label'))!;
    const name = label.split(', ').at(-1)!;
    positions.set(name, [...(positions.get(name) ?? []), index]);
    if (first) {
      if (first.name !== name) {
        await expect(
          page.getByText('Chưa trùng cặp. Ghi nhớ vị trí rồi thử lại nhé!'),
        ).toBeVisible();
        await expect(card).toHaveAttribute('aria-label', `Thẻ ${index + 1}, chưa lật`);
      }
      first = undefined;
    } else first = { index, name };
  }
  for (const indices of positions.values()) {
    for (const index of indices) {
      const card = page.getByRole('button', { name: new RegExp(`^Thẻ ${index + 1},`) });
      if ((await card.getAttribute('aria-label'))!.includes('đã ghép')) break;
      await card.click();
    }
  }
  await expect(page.getByRole('heading', { name: 'Bạn đã ghép đủ 6 cặp!' })).toBeVisible();
  const moves = Number(
    (await page.getByText(/^Hoàn thành sau \d+ lượt lật$/).innerText()).match(/\d+/)![0],
  );
  await expect(page.getByText(`${600 - (moves - 6) * 10} điểm`, { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/green-memory-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click();
  await expect(page.getByText('Lượt lật: 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /chưa lật$/ })).toHaveCount(12);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByText('Rời lượt chơi?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục chơi', exact: true }).click();
  await expect(page.getByText('Lượt lật: 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Rời lượt chơi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trò chơi', exact: true })).toBeVisible();
});

test('a direct game link opens the instructions and the board fits mobile widths', async ({
  page,
}) => {
  await page.goto('/game?mode=memory');
  await expect(page.getByRole('heading', { name: 'Cách chơi' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu lật thẻ' }).click();
  for (const width of [360, 390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('button', { name: 'Thẻ 12, chưa lật', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `test-results/green-memory-${width}.png`, fullPage: true });
  }
});
