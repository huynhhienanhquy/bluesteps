import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  // Exercise the guest navigation independently of backend availability.
  await page.route('**/v1/**', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập.' } },
    }),
  );
});

async function welcome(page: Page) {
  await expect(page).toHaveURL(/\/onboarding(?:\?|$)/);
  await page.getByRole('button', { name: 'Tiếp tục đến màn chào mừng' }).click();
  await expect(page.getByRole('heading', { name: /Một khởi đầu nhỏ/ })).toBeVisible();
}

async function completeIntroduction(page: Page) {
  await expect(page.getByRole('button', { name: /Đã có tài khoản/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Ít đồ dùng một lần/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bỏ qua', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Đồ cũ/ })).toBeVisible();
  await page.getByRole('button', { name: 'Thử phân loại rác', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chai nhựa về đâu?' })).toBeVisible();
  await page.getByRole('button', { name: 'Tái chế', exact: true }).click();
  await expect(
    page.getByText('Đúng rồi! Chai nhựa sạch có thể được thu gom để tái chế.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Bạn muốn bắt đầu/ })).toBeVisible();
  const sorting = page.getByRole('checkbox', { name: 'Phân loại rác', exact: true });
  if (!(await sorting.isChecked())) await sorting.click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Bước nhỏ nào/ })).toBeVisible();
  await page.getByRole('radio', { name: 'Phân loại rác mỗi ngày', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Phân loại rác', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Phân loại rác mỗi ngày', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Chọn mục tiêu này', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Một điểm đến gần/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem điểm thu gom', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Một lời nhắc nhẹ/ })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ qua bước này', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Hành trình xanh/ })).toBeVisible();
  await expect(page.getByText('Phân loại rác mỗi ngày', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bluesteps.onboarding.v1'))).toBeNull();
}

test('every launch visits all introduction pages before login, including after completion', async ({
  page,
}) => {
  await page.goto('/');
  await welcome(page);
  await page.screenshot({ path: 'test-results/onboarding-welcome.png', fullPage: true });
  await completeIntroduction(page);
  await page.screenshot({ path: 'test-results/onboarding-ready.png', fullPage: true });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('bluesteps.onboarding.v1'))).toBe(null);
  await page.screenshot({ path: 'test-results/onboarding-login.png', fullPage: true });
  await page.reload();
  await welcome(page);
  await completeIntroduction(page);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
});

test('a completion flag from an older version cannot skip the introduction', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bluesteps.onboarding.v1', 'complete'));
  await page.goto('/login');
  await welcome(page);
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(0);
});

for (const path of ['/login', '/register', '/onboarding?step=9']) {
  test(`an unfinished introduction cannot be bypassed through ${path}`, async ({ page }) => {
    await page.goto(path);
    await welcome(page);
    await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).click();
    await page.reload();
    await welcome(page);
    await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(0);
  });
}

test('the last page can open registration after completing the introduction', async ({ page }) => {
  await page.goto('/login');
  await welcome(page);
  await completeIntroduction(page);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('textbox', { name: 'Họ và tên', exact: true })).toBeVisible();
});

test('a restored account keeps access to its preference setup', async ({ page }) => {
  await page.route('**/v1/auth/web/refresh', (route) =>
    route.fulfill({
      json: { accessToken: 'test-session', sessionId: 'test-session' },
    }),
  );
  await page.route('**/v1/me', (route) =>
    route.fulfill({ json: { id: 'member', name: 'Member' } }),
  );
  await page.route('**/v1/me/preferences', (route) =>
    route.fulfill({
      json: { theme: 'system', interests: [], goal: null, version: 1 },
    }),
  );
  await page.route('**/v1/me/notification-preferences', (route) =>
    route.fulfill({ json: { dailyReminder: false, dailyTime: '20:00', version: 1 } }),
  );
  await page.goto('/onboarding?step=6');
  await expect(page.getByRole('heading', { name: /Bước nhỏ nào/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bỏ qua', exact: true })).toBeVisible();
});
