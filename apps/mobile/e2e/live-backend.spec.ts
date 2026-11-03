import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const env = process.env;
const run = env.BLUESTEPS_E2E_RUN!;
const api = env.BLUESTEPS_E2E_API_URL!;
const password = env.BLUESTEPS_E2E_PASSWORD!;
const alice = env.BLUESTEPS_E2E_ALICE_NAME!;
const bob = env.BLUESTEPS_E2E_BOB_NAME!;
const auditOutput = env.BLUESTEPS_AUDIT_OUTPUT;
const auditEntities = { post: '', conversation: '', route: '', stop: '' };
const auditRequests = new Map<Page, { method: string; path: string; status: number }[]>();
// The real API permits ten logins per account in a five-minute bucket. Keep this
// serial suite within that limit instead of weakening the backend policy for tests.
const loginBuckets = new Map<string, { window: number; count: number }>();
test.skip(!run || !api, 'Run through the isolated API/PostGIS browser harness');
test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  // This suite checks returning users. The first-launch gate has its own onboarding suite.
  await page.addInitScript(() => {
    // Map embeds use a sandboxed iframe without storage access. Set this only on the app document.
    if (window.top === window) localStorage.setItem('bluesteps.onboarding.v1', 'complete');
  });
  if (auditOutput) {
    auditRequests.set(page, []);
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/v1/'))
        auditRequests.get(page)?.push({
          method: response.request().method(),
          path: url.pathname,
          status: response.status(),
        });
    });
  }
  page.on('pageerror', (error) => {
    throw error;
  });
});

test.afterEach(({ page }, info) => {
  if (!auditOutput) return;
  const directory = join(auditOutput, 'tests');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `${info.title.replaceAll(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`),
    JSON.stringify(
      {
        title: info.title,
        status: info.status,
        expectedStatus: info.expectedStatus,
        durationMs: info.duration,
        requests: auditRequests.get(page) ?? [],
      },
      null,
      2,
    ),
  );
  auditRequests.delete(page);
});

async function login(page: Page, account: 'ALICE' | 'BOB' = 'ALICE') {
  await page.goto('/login');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  const welcome = page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true });
  await expect(email.or(welcome)).toBeVisible();
  if (await welcome.isVisible()) {
    // Introduction completion is per guest session; the old storage marker is ignored.
    for (const name of [
      'Bắt đầu hành trình',
      'Tiếp tục',
      'Thử phân loại rác',
      'Để sau',
      'Tiếp tục',
      'Chọn mục tiêu này',
      'Để sau',
      'Bỏ qua bước này',
      'Đăng nhập',
    ])
      await page.getByRole('button', { name, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: /Google|Facebook/ })).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill(env[`BLUESTEPS_E2E_${account}_EMAIL`]!);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(password);
  const windowMs = 300_000;
  if (windowMs - (Date.now() % windowMs) < 2000) {
    await test.step('Avoid crossing the API rate bucket during form submission', () =>
      page.waitForTimeout(windowMs - (Date.now() % windowMs) + 1000));
  }
  let window = Math.floor(Date.now() / windowMs);
  const bucket = loginBuckets.get(account);
  if (bucket?.window === window && bucket.count >= 10) {
    const waitMs = (window + 1) * windowMs - Date.now() + 1000;
    test.setTimeout(test.info().timeout + waitMs);
    await test.step('Honor the real API login rate window', () => page.waitForTimeout(waitMs));
    window = Math.floor(Date.now() / windowMs);
  }
  const previous = loginBuckets.get(account);
  loginBuckets.set(account, {
    window,
    count: previous?.window === window ? previous.count + 1 : 1,
  });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Chào ${account === 'ALICE' ? alice : bob}!`, exact: true }),
  ).toBeVisible();
}

test('public catalogs come from database IDs and never expose synthetic seeds', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByText('Chào Linh Chi!', { exact: true })).toHaveCount(0);
  await page.goto('/articles');
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/articles/${env.BLUESTEPS_E2E_ARTICLE_ID}$`));
  await expect(
    page.getByText(`Nội dung bài đọc từ cơ sở dữ liệu ${run}`, { exact: true }),
  ).toBeVisible();
  await page.goto('/handbook');
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_WASTE_NAME!, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/handbook/${env.BLUESTEPS_E2E_WASTE_ID}$`));
  await expect(
    page.getByText('1. Hướng dẫn từ dữ liệu đã công bố.', { exact: true }),
  ).toBeVisible();
  await page.goto('/collection');
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_NAME!, exact: true }),
  ).toBeVisible();
});

test('register, real outbox email verification and login issue a browser cookie', async ({
  page,
  context,
}) => {
  const email = `registered-${run}@example.com`;
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Họ và tên', exact: true }).fill(`Người mới ${run}`);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
  let code = '';
  await expect
    .poll(() => {
      const directory = env.BLUESTEPS_E2E_MAIL_DIR!;
      if (!existsSync(directory)) return false;
      for (const name of readdirSync(directory)) {
        if (!name.endsWith('.json')) continue;
        const mail = JSON.parse(readFileSync(join(directory, name), 'utf8'));
        if (mail.to === email) {
          code = mail.code;
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  await page.getByRole('textbox', { name: 'Mã xác minh', exact: true }).fill(code);
  await page.getByRole('button', { name: 'Xác nhận mã', exact: true }).click();
  await expect(
    page.getByText('Email đã được xác minh. Bạn có thể đăng nhập.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Chào Người mới ${run}!`, exact: true }),
  ).toBeVisible();
  const cookie = (await context.cookies(`${api}/v1/auth/web/refresh`)).find(
    (item) => item.name === 'bluesteps_refresh',
  );
  expect(cookie?.httpOnly).toBe(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Chào Người mới ${run}!`, exact: true }),
  ).toBeVisible();
  const stores = await page.evaluate(() => [
    ...Object.entries(localStorage),
    ...Object.entries(sessionStorage),
  ]);
  expect(JSON.stringify(stores)).not.toContain('refreshToken');
  expect(JSON.stringify(stores)).not.toContain('accessToken');
});

test('profile, zero wallet and manual sorting remain canonical after reload', async ({ page }) => {
  await login(page);
  await page.goto('/rewards');
  await expect(page.getByText('0 điểm', { exact: true })).toBeVisible();
  await expect(page.getByText('180 điểm', { exact: true })).toHaveCount(0);
  await page.goto('/edit-profile');
  await expect(page.getByRole('textbox', { name: 'Họ và tên', exact: true })).toHaveValue(alice);
  await page.getByRole('button', { name: 'Chỉnh sửa giới thiệu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Giới thiệu', exact: true })
    .fill(`Hồ sơ lưu PostgreSQL ${run}`);
  await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
  await expect(page.getByText('Đã lưu hồ sơ.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Chỉnh sửa giới thiệu', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Giới thiệu', exact: true })).toHaveValue(
    `Hồ sơ lưu PostgreSQL ${run}`,
  );
  await page.goto(`/handbook/${env.BLUESTEPS_E2E_WASTE_ID}`);
  await page
    .getByRole('textbox', { name: 'Khối lượng đã cân (kg, không bắt buộc)', exact: true })
    .fill('1,25');
  const feedbackClip = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('.wav'),
  );
  await page.getByRole('button', { name: 'Ghi nhận đã phân loại', exact: true }).click();
  expect((await feedbackClip).status()).toBe(200);
  await expect(page.getByText('Đã lưu hành động. Điểm thưởng: 5.', { exact: true })).toBeVisible();
  await page.goto('/statistics');
  await expect(page.getByText('1 lượt phân loại', { exact: true })).toBeVisible();
  await expect(page.getByText('1,25 kg tự ghi nhận', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 lượt phân loại', { exact: true })).toBeVisible();
});

test('article save, reaction and discussion survive a new page instance', async ({ page }) => {
  await login(page);
  await page.goto(`/articles/${env.BLUESTEPS_E2E_ARTICLE_ID}`);
  await page.getByRole('button', { name: 'Lưu vào danh sách đọc', exact: true }).click();
  const body = page.getByText(`Nội dung bài đọc từ cơ sở dữ liệu ${run}`, { exact: true });
  await body.evaluate((element) => {
    let container = element.parentElement;
    while (
      container &&
      !(
        container.scrollHeight > container.clientHeight + 5 &&
        /auto|scroll/.test(getComputedStyle(container).overflowY)
      )
    )
      container = container.parentElement;
    if (!container) throw new Error('Missing article scroll container');
    container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    container.dispatchEvent(new Event('scroll'));
  });
  await expect(page.getByText(/^Tiến độ đã lưu: [1-9]\d?%$/)).toBeVisible();
  await page.goto('/articles/reading-list');
  await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click();
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }).click();
  await expect(page).toHaveURL(/resume=1/);
  await expect
    .poll(() =>
      body.evaluate((element) => {
        let container = element.parentElement;
        while (
          container &&
          !(
            container.scrollHeight > container.clientHeight + 5 &&
            /auto|scroll/.test(getComputedStyle(container).overflowY)
          )
        )
          container = container.parentElement;
        return container?.scrollTop ?? 0;
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Bỏ lưu bài viết', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thích bài viết', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ thích bài viết', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bỏ lưu bài viết', exact: true })).toBeVisible();
  await expect(page.getByText('1 lượt thích', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thảo luận', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nội dung bình luận', exact: true }).fill(`Cha ${run}`);
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(page.getByText(`Cha ${run}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thích bình luận', exact: true }).click();
  await expect(page.getByText('1 lượt thích bình luận', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Bỏ thích bình luận', exact: true }).click();
  await expect(page.getByText('0 lượt thích bình luận', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Trả lời ${alice}`, exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nội dung bình luận', exact: true })
    .fill(`Trả lời ${run}`);
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(page.getByText(`Trả lời ${run}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bình luận', exact: true }).last().click();
  await page.getByRole('button', { name: 'Xác nhận xóa bình luận', exact: true }).click();
  await expect(page.getByText('Bình luận đã xóa', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Trả lời ${run}`, { exact: true })).toBeVisible();
  await page.goto('/articles/saved');
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
});

test('community writes are server-owned and account switching hides private state', async ({
  page,
}) => {
  await login(page);
  await page.goto('/compose');
  await page
    .getByRole('textbox', { name: 'Nội dung bài viết', exact: true })
    .fill(`Riêng tư ${run}`);
  await page.getByRole('button', { name: 'Công khai', exact: true }).click();
  await page.getByRole('button', { name: 'Chỉ mình tôi', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Xem bài viết', exact: true }).click();
  await expect(page).toHaveURL(/\/discussion\?id=/);
  await expect(page.getByText(`Riêng tư ${run}`, { exact: true })).toBeVisible();
  const privateUrl = page.url();
  auditEntities.post = new URL(privateUrl).searchParams.get('id') ?? '';
  await page.reload();
  await expect(page.getByText(`Riêng tư ${run}`, { exact: true })).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page, 'BOB');
  await page.goto('/articles/saved');
  await expect(page.getByText('Chưa có bài viết đã lưu', { exact: true })).toBeVisible();
  await page.goto(privateUrl);
  await expect(page.getByRole('alert').first()).toContainText('Không tìm thấy');
  await expect(page.getByText(`Riêng tư ${run}`, { exact: true })).toHaveCount(0);
});

test('collection GPS filters comparison and active replacement persist through API and reload', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await login(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 16.07, longitude: 108.22 });
  await page.goto('/collection-filters');
  await page.getByRole('button', { name: '3 km', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Dùng vị trí hiện tại', exact: true }).click();
  await expect(page.getByText(/Đã lấy vị trí/)).toBeVisible();
  for (const name of ['Đang mở cửa', 'Mở 24 giờ', 'Chỉ hiện điểm còn chỗ', 'Có nhân viên hỗ trợ'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByText(env.BLUESTEPS_E2E_POINT_NAME!, { exact: true })).toBeVisible();
  await expect(page.getByText(env.BLUESTEPS_E2E_POINT_FULL_NAME!, { exact: true })).toHaveCount(0);
  await expect(page.getByText(env.BLUESTEPS_E2E_POINT_FAR_NAME!, { exact: true })).toHaveCount(0);
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole('button', { name: 'Nhận một trong các vật liệu', exact: true }),
    ).toBeInViewport();
    await expect(page.getByRole('button', { name: '10 km', exact: true })).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `collection-filters-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await expect(page).toHaveURL(/\/collection\?/);
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await expect(page.getByRole('button', { name: '3 km', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Chọn so sánh ' + env.BLUESTEPS_E2E_POINT_NAME, exact: true })
    .check();
  await page
    .getByRole('checkbox', {
      name: 'Chọn so sánh ' + env.BLUESTEPS_E2E_POINT_FAR_NAME,
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'So sánh điểm đã chọn', exact: true }).click();
  await expect(page.getByText('Điểm được gợi ý', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Chọn điểm ' + env.BLUESTEPS_E2E_POINT_NAME, exact: true })
    .click();
  await expect(page).toHaveURL(/\/collection-route\?id=/);
  await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).click();
  await page.getByRole('button', { name: 'Thay điểm này', exact: true }).click();
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_FAR_NAME!, exact: true }).click();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_FULL_NAME!, exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Xác nhận thay điểm', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-route\?id=/);
  await expect(
    page
      .getByText('1. ' + env.BLUESTEPS_E2E_POINT_FAR_NAME, { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByText('1. ' + env.BLUESTEPS_E2E_POINT_FAR_NAME, { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'collection-replaced-390.png') });
});

test('collection proposals photos draft submit moderation and reports persist through API', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(150_000);
  await login(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 16.07, longitude: 108.22 });
  const proposedName = `Điểm đề xuất ${run}`;
  await page.goto('/point-proposal');
  await page.getByRole('textbox', { name: 'Tên điểm thu gom *', exact: true }).fill(proposedName);
  await page.getByRole('textbox', { name: 'Địa chỉ *', exact: true }).fill('Lối vào khu dân cư');
  await page.getByRole('button', { name: 'Dùng vị trí hiện tại cho ghim', exact: true }).click();
  await expect(page.getByText('Ghim: 16.070000, 108.220000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chỉnh ghim', exact: true }).click();
  const pinMap = page.frameLocator('iframe[title="Bản đồ điểm thu gom"]');
  await expect(pinMap.locator('html')).toHaveAttribute('data-map-loaded', 'true', {
    timeout: 30_000,
  });
  await pinMap.locator('canvas').click({ position: { x: 70, y: 50 } });
  await expect(page.getByRole('textbox', { name: 'Vĩ độ', exact: true })).not.toHaveValue(
    '16.070000',
  );
  await page.getByRole('button', { name: 'Dùng vị trí hiện tại cho ghim', exact: true }).click();
  await expect(page.getByText('Ghim: 16.070000, 108.220000', { exact: true })).toBeVisible();
  const marker = pinMap.locator('.maplibregl-marker');
  const box = await marker.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 35, box!.y + box!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Kinh độ', exact: true })).not.toHaveValue(
    '108.220000',
  );
  await page.getByRole('button', { name: 'Dùng vị trí hiện tại cho ghim', exact: true }).click();
  await expect(page.getByText('Ghim: 16.070000, 108.220000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dịch ghim về Bắc', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Vĩ độ', exact: true })).not.toHaveValue(
    '16.070000',
  );
  await page.getByRole('button', { name: 'Xong chỉnh ghim', exact: true }).click();
  await page.getByRole('button', { name: 'Nhựa', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Giờ tiếp nhận (nếu biết)', exact: true })
    .fill('Thứ Bảy 08:00–17:00');
  await expect(
    page.getByRole('button', { name: 'Gửi đề xuất để xét duyệt', exact: true }),
  ).toBeDisabled();
  const photo = {
    name: 'evidence.png',
    mimeType: 'image/png',
    buffer: readFileSync(join(process.cwd(), 'assets/images/scan/leaf.png')),
  };
  let chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Thêm ảnh địa điểm', exact: true }).click();
  await (await chooser).setFiles(photo);
  await expect(page.getByRole('button', { name: 'Bỏ ảnh 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/point-proposal\?id=/);
  const draftUrl = page.url(),
    proposalId = new URL(draftUrl).searchParams.get('id')!;
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Tên điểm thu gom *', exact: true })).toHaveValue(
    proposedName,
  );
  await expect(page.getByRole('button', { name: 'Bỏ ảnh 1', exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Địa chỉ *', exact: true })
    .fill('Lối vào khu dân cư · ghim đã chỉnh');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu bản nháp.', { exact: true })).toBeVisible();
  await page.goto('/point-proposal');
  await page.getByRole('button', { name: `${proposedName} · Bản nháp`, exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Địa chỉ *', exact: true })).toHaveValue(
    'Lối vào khu dân cư · ghim đã chỉnh',
  );
  await page
    .getByRole('checkbox', {
      name: 'Tôi xác nhận thông tin này là đề xuất từ cộng đồng, chưa được xác minh.',
      exact: true,
    })
    .check();
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByText('Cùng mở rộng bản đồ xanh', { exact: true })
      .filter({ visible: true })
      .scrollIntoViewIfNeeded();
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `collection-proposal-top-${width}.png`) });
    await page
      .getByRole('button', { name: 'Gửi đề xuất để xét duyệt', exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `collection-proposal-draft-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Gửi đề xuất để xét duyệt', exact: true }).click();
  await expect(
    page.getByText('Đang chờ xét duyệt', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Đang chờ xét duyệt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu bản nháp', exact: true })).toHaveCount(0);
  const session = await request.post(api + '/v1/auth/login', {
    data: { email: env.BLUESTEPS_E2E_BOB_EMAIL, password },
  });
  expect(session.ok()).toBeTruthy();
  const authorization = { Authorization: `Bearer ${(await session.json()).accessToken}` };
  const queue = await request.get(api + '/v1/admin/collection-submissions/proposals', {
    headers: authorization,
  });
  expect(queue.ok()).toBeTruthy();
  const pending = (await queue.json()).items.find((p: { id: string }) => p.id === proposalId);
  expect(pending.media).toHaveLength(1);
  const approve = await request.post(api + `/v1/admin/point-proposals/${proposalId}/decision`, {
    headers: authorization,
    data: { decision: 'approve', reason: 'Đã xác minh địa điểm', expectedVersion: pending.version },
  });
  expect(approve.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByText('Đã duyệt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem điểm được công bố', exact: true }).click();
  await expect(page.getByRole('heading', { name: proposedName, exact: true })).toBeVisible();
  await page.goto('/point-report?id=' + env.BLUESTEPS_E2E_POINT_ID);
  await page.getByRole('button', { name: 'Chụp ảnh địa điểm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đóng camera', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng camera', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Không tiếp nhận loại rác đã công bố', exact: true })
    .check();
  await page
    .getByRole('textbox', { name: 'Mô tả thêm', exact: true })
    .fill('Không tiếp nhận nhựa như công bố');
  chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Thêm ảnh địa điểm', exact: true }).click();
  await (await chooser).setFiles(photo);
  await expect(page.getByRole('button', { name: 'Bỏ ảnh 1', exact: true })).toBeVisible();
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByText(env.BLUESTEPS_E2E_POINT_NAME!, { exact: true }).scrollIntoViewIfNeeded();
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `collection-report-${width}.png`) });
    await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `collection-report-bottom-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(page).toHaveURL(/\/point-report\?report=/);
  await page.reload();
  await expect(page.getByText('Đang chờ xét duyệt', { exact: true })).toBeVisible();
  await expect(page.getByText('Không tiếp nhận nhựa như công bố', { exact: true })).toBeVisible();
});

test('routing preview navigation live GPS and handover finish a real route', async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  await login(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 16.069, longitude: 108.219, accuracy: 5 });
  await page.goto('/journey');
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_NAME!, exact: true }).click();
  await page.getByRole('button', { name: 'Lưu hành trình', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-route\?id=/);
  await page.getByRole('button', { name: 'Xe máy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const plannedResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      /\/routes\/[^/]+\/plan$/.test(new URL(r.url()).pathname) &&
      r.status() === 200,
  );
  await page.getByRole('button', { name: 'Tính tuyến đường', exact: true }).click();
  const planned = await (await plannedResponse).json();
  await expect(page.getByRole('button', { name: 'Bắt đầu chỉ đường', exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText('© OpenStreetMap contributors · Routing: Valhalla', { exact: true }),
  ).toBeVisible();
  const renderedMap = page.frameLocator('iframe[title="Bản đồ điểm thu gom"]').first();
  await expect(renderedMap.locator('html')).toHaveAttribute('data-map-loaded', 'true', {
    timeout: 30_000,
  });
  await expect
    .poll(async () => Number(await renderedMap.locator('html').getAttribute('data-route-points')))
    .toBeGreaterThan(1);
  await expect(renderedMap.locator('canvas.maplibregl-canvas')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bắt đầu chỉ đường', exact: true })).toBeVisible();
  await expect(renderedMap.locator('html')).toHaveAttribute('data-map-loaded', 'true', {
    timeout: 30_000,
  });
  await page
    .getByRole('heading', { name: 'Chi tiết hành trình', exact: true })
    .scrollIntoViewIfNeeded();
  if (auditOutput) await page.screenshot({ path: join(auditOutput, 'route-preview-390.png') });
  await page.getByRole('button', { name: 'Bắt đầu chỉ đường', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-navigation\?id=/);
  await page.getByRole('button', { name: 'Theo dõi vị trí khi chỉ đường', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Tính lại từ vị trí hiện tại', exact: true }),
  ).toBeEnabled({ timeout: 15_000 });
  const remaining = page.getByText(/^Còn lại:/);
  await expect(remaining).toBeVisible();
  const beforeMovement = await remaining.textContent();
  const geometry = planned.plan.legs[0].geometry;
  const halfway = geometry[Math.floor(geometry.length / 2)];
  await context.setGeolocation({
    latitude: halfway.latitude,
    longitude: halfway.longitude,
    accuracy: 5,
  });
  await expect(remaining).not.toHaveText(beforeMovement!, { timeout: 15_000 });
  await context.setGeolocation({ latitude: 16.074, longitude: 108.222, accuracy: 5 });
  await expect(
    page.getByText('Bạn có thể đã lệch tuyến. Cập nhật tuyến từ vị trí hiện tại để tiếp tục.', {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Tính lại từ vị trí hiện tại', exact: true }).click();
  await expect(
    page.getByText('Bạn có thể đã lệch tuyến. Cập nhật tuyến từ vị trí hiện tại để tiếp tục.', {
      exact: true,
    }),
  ).toHaveCount(0, { timeout: 30_000 });
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole('heading', { name: 'Đang chỉ đường', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(renderedMap.locator('html')).toHaveAttribute('data-map-loaded', 'true', {
      timeout: 30_000,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `route-navigation-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Đã đến nơi', exact: true }).click();
  await page.getByRole('button', { name: 'Tôi đã đến điểm', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận đã bàn giao', exact: true }).click();
  await expect(
    page.getByText('Đã lưu bàn giao tự khai. Chưa có điểm thưởng được cấp.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xem hành trình đã hoàn tất', exact: true }).click();
  await expect(
    page.getByText('Trạng thái: completed', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});

test('journey planner drag keyboard materials preview edit conflict and start persist', async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await login(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 16.069, longitude: 108.219, accuracy: 5 });
  const first = env.BLUESTEPS_E2E_POINT_NAME!,
    second = env.BLUESTEPS_E2E_POINT_FAR_NAME!;
  await page.goto('/journey');
  await page.getByRole('button', { name: 'Nhựa', exact: true }).click();
  await page.getByRole('button', { name: first, exact: true }).click();
  await page.getByRole('button', { name: 'Thêm điểm dừng', exact: true }).click();
  await page.getByRole('button', { name: second, exact: true }).click();
  await page.getByRole('button', { name: 'Xe đạp', exact: true }).click();
  await page.getByText('Điểm dừng theo thứ tự', { exact: true }).scrollIntoViewIfNeeded();
  const a = await page
      .getByRole('button', { name: 'Đổi thứ tự ' + first, exact: true })
      .boundingBox(),
    b = await page.getByRole('button', { name: 'Đổi thứ tự ' + second, exact: true }).boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 16 });
  await page.mouse.up();
  const order = page.getByRole('button', { name: /^Đổi thứ tự / });
  await expect
    .poll(() => order.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))))
    .toEqual(['Đổi thứ tự ' + second, 'Đổi thứ tự ' + first]);
  await page.getByRole('button', { name: 'Đổi thứ tự ' + second, exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() => order.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))))
    .toEqual(['Đổi thứ tự ' + first, 'Đổi thứ tự ' + second]);
  await page.getByRole('button', { name: 'Đổi thứ tự ' + second, exact: true }).focus();
  await page.keyboard.press('ArrowUp');
  const previewResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/v1/routes/preview' &&
      r.status() === 200,
  );
  await page.getByRole('button', { name: 'Xem trước tuyến đường', exact: true }).click();
  const plan = await (await previewResponse).json();
  expect(plan.stopIds).toEqual([env.BLUESTEPS_E2E_POINT_FAR_ID, env.BLUESTEPS_E2E_POINT_ID]);
  expect(plan.legs).toHaveLength(2);
  await expect(page.getByText('Tổng quãng đường', { exact: true })).toBeVisible();
  const map = page.frameLocator('iframe[title="Bản đồ điểm thu gom"]').first();
  await expect(map.locator('html')).toHaveAttribute('data-map-loaded', 'true', { timeout: 30_000 });
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 926 });
    await page
      .getByRole('heading', { name: 'Hành trình thu gom', exact: true })
      .scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (auditOutput)
      await page.screenshot({ path: join(auditOutput, `journey-planner-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Lưu hành trình', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-route\?id=/);
  const routeUrl = page.url();
  await page.reload();
  await page.getByRole('button', { name: 'Sửa điểm dừng và phương tiện', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nhựa', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(() => order.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))))
    .toEqual(['Đổi thứ tự ' + second, 'Đổi thứ tự ' + first]);
  const stale = await context.newPage();
  try {
    await stale.goto(page.url());
    await expect(stale.getByRole('button', { name: 'Nhựa', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Bỏ điểm ' + first, exact: true }).click();
    await page.getByRole('button', { name: 'Lưu điểm dừng và phương tiện', exact: true }).click();
    await expect(page).toHaveURL(routeUrl);
    await stale.getByRole('button', { name: 'Lưu điểm dừng và phương tiện', exact: true }).click();
    await expect(
      stale.getByText('Hành trình đã thay đổi hoặc đã bắt đầu.', { exact: true }),
    ).toBeVisible();
  } finally {
    await stale.close();
  }
  await page.getByRole('button', { name: 'Sửa điểm dừng và phương tiện', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu hành trình • 1 điểm', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-navigation\?id=/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Đang chỉ đường', exact: true })).toBeVisible();
});

test('messages and inbox delivery persist through the real worker', async ({ page }) => {
  await login(page);
  await page.goto('/messages');
  await page.getByRole('textbox', { name: 'Tìm người dùng để nhắn tin', exact: true }).fill(bob);
  await page.getByRole('button', { name: `Nhắn tin ${bob}`, exact: true }).click();
  await expect(page).toHaveURL(/\/conversation\?id=/);
  auditEntities.conversation = new URL(page.url()).searchParams.get('id') ?? '';
  await page
    .getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })
    .fill(`Tin nhắn lưu server ${run}`);
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByText(`Tin nhắn lưu server ${run}`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Tin nhắn lưu server ${run}`, { exact: true })).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page, 'BOB');
  await page.goto('/messages');
  await page.getByRole('button', { name: alice, exact: true }).click();
  await expect(page.getByText(`Tin nhắn lưu server ${run}`, { exact: true })).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Tin nhắn mới', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Chưa đọc', exact: true }).click();
  await page.getByRole('button', { name: 'Chi tiết Tin nhắn mới', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tin nhắn mới', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem nội dung liên quan', exact: true }).click();
  await expect(page).toHaveURL(/\/conversation\?id=/);
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đánh dấu đã đọc', exact: true })).toHaveCount(0);
});

test('chat emoji media and live replies persist for two real accounts', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await login(page);
  await page.goto('/messages');
  await page.getByRole('textbox', { name: 'Tìm người dùng để nhắn tin', exact: true }).fill(bob);
  await page.getByRole('button', { name: `Nhắn tin ${bob}`, exact: true }).click();
  await expect(page).toHaveURL(/\/conversation\?id=/);
  const thread = page.url();
  const other = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
  });
  try {
    await other.addInitScript(() => localStorage.setItem('bluesteps.onboarding.v1', 'complete'));
    const recipient = await other.newPage();
    recipient.on('pageerror', (error) => {
      throw error;
    });
    await login(recipient, 'BOB');
    await recipient.goto(thread);
    await page.getByRole('button', { name: 'Chọn emoji', exact: true }).click();
    await page.getByRole('button', { name: 'Chèn emoji 💚', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })).toHaveValue(
      '💚',
    );
    await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(recipient.getByText('💚', { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Đính kèm', exact: true }).click();
    await page.getByRole('button', { name: 'Chụp ảnh', exact: true }).click();
    await expect(page.getByText('Chụp ảnh cho tin nhắn', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng camera', exact: true }).click();
    await page.getByRole('button', { name: 'Đính kèm', exact: true }).click();
    const chooseImage = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Chọn ảnh hoặc video', exact: true }).click();
    await (
      await chooseImage
    ).setFiles({
      name: 'chat.png',
      mimeType: 'image/png',
      buffer: readFileSync(join(process.cwd(), 'assets/images/scan/leaf.png')),
    });
    await expect(page.getByRole('button', { name: 'Gỡ tệp chat.png', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByRole('button', { name: 'Đính kèm', exact: true }).click();
    const chooseFile = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Chọn tệp', exact: true }).click();
    await (
      await chooseFile
    ).setFiles({
      name: 'chat.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`private chat ${run}`),
    });
    await page
      .getByRole('textbox', { name: 'Chú thích tin nhắn', exact: true })
      .fill(`Ảnh và tệp ${run}`);
    await expect(
      page.getByRole('button', { name: 'Gửi tin nhắn từ xem trước', exact: true }),
    ).toBeEnabled();
    if (auditOutput) await page.screenshot({ path: join(auditOutput, 'chat-preview-390.png') });
    await page.getByRole('button', { name: 'Gửi tin nhắn từ xem trước', exact: true }).click();
    await expect(recipient.getByText(`Ảnh và tệp ${run}`, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    const downloaded = recipient.waitForEvent('download');
    await recipient.getByRole('button', { name: 'Tải tệp chat.txt', exact: true }).click();
    expect(readFileSync((await (await downloaded).path())!, 'utf8')).toBe(`private chat ${run}`);
    await page.getByRole('button', { name: 'Ghi âm', exact: true }).click();
    await expect(
      page.getByText('Chức năng ghi âm hiện chưa được bật.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await recipient
      .getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })
      .fill(`Trả lời tự động ${run}`);
    await recipient.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await expect(page.getByText(`Trả lời tự động ${run}`, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.getByText(`Trả lời tự động ${run}`, { exact: true })).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (auditOutput)
        await page.screenshot({ path: join(auditOutput, `chat-restored-${viewport.width}.png`) });
    }
    await page.getByRole('button', { name: 'Xem trang cá nhân', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/community\\?member=${env.BLUESTEPS_E2E_BOB_ID}$`));
  } finally {
    await other.close();
  }
});

test('saved activity collections and route handover write canonical database state', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`/events/${env.BLUESTEPS_E2E_EVENT_ID}`);
  await page.getByRole('button', { name: 'Lưu hoạt động', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ lưu hoạt động', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bỏ lưu hoạt động', exact: true })).toBeVisible();
  await page.goto('/event-collections');
  const name = `Kế hoạch ${run}`;
  await page.getByRole('button', { name: 'Mở tạo bộ sưu tập', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tên bộ sưu tập', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Tạo bộ sưu tập', exact: true }).click();
  await page.getByRole('button', { name: `Chọn ${name}`, exact: true }).click();
  await page.getByRole('button', { name: `Tùy chọn ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_EVENT_NAME!, exact: true }).click();
  await page.getByRole('button', { name: 'Thêm hoạt động vào bộ sưu tập', exact: true }).click();
  const selectedEvent = page.getByRole('checkbox', {
    name: env.BLUESTEPS_E2E_EVENT_NAME!,
    exact: true,
  });
  await expect(selectedEvent).toBeVisible();
  await page.reload();
  await expect(selectedEvent).toBeVisible();
  const target = `Đi cùng nhau ${run}`;
  await page.getByRole('button', { name: 'Mở tạo bộ sưu tập', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tên bộ sưu tập', exact: true }).fill(target);
  await page.getByRole('button', { name: 'Tạo bộ sưu tập', exact: true }).click();
  await page.getByRole('button', { name: `Chọn ${name}`, exact: true }).click();
  await selectedEvent.click();
  const visual =
    auditOutput ?? join(process.cwd(), '../../docs/ui-implementation-2026-11-01/live-visual');
  mkdirSync(visual, { recursive: true });
  await page.screenshot({ path: join(visual, 'event-collections-selected.png') });
  const moveAction = page.getByRole('button', {
    name: `Chuyển 1 hoạt động vào ${target}`,
    exact: true,
  });
  await moveAction.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(visual, 'event-collections-selected-bottom.png') });
  await moveAction.click();
  await expect(
    page.getByText(`Đã chuyển 1 hoạt động vào ${target}.`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Chọn ${target}`, exact: true }).click();
  await expect(selectedEvent).toBeVisible();
  await selectedEvent.click();
  await page.getByRole('button', { name: `Chuyển 1 hoạt động vào ${name}`, exact: true }).click();
  await expect(page.getByText(`Đã chuyển 1 hoạt động vào ${name}.`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Tùy chọn ${name}`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Đổi tên bộ sưu tập', exact: true }).fill(`${name} mới`);
  await page.getByRole('button', { name: 'Lưu tên bộ sưu tập', exact: true }).click();
  await expect(page.getByRole('button', { name: `Chọn ${name} mới`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Tùy chọn ${target}`, exact: true }).click();
  await page.getByRole('button', { name: `Xóa ${target}`, exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa bộ sưu tập', exact: true }).click();
  await expect(page.getByRole('button', { name: `Chọn ${target}`, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(selectedEvent).toBeVisible();
  await page.goto('/journey');
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_NAME!, exact: true }).click();
  await page.getByRole('button', { name: 'Lưu hành trình', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).click();
  await page.getByRole('button', { name: 'Đến điểm và bàn giao', exact: true }).click();
  await expect(page).toHaveURL(/\/collection-arrival\?/);
  auditEntities.route = new URL(page.url()).searchParams.get('id') ?? '';
  auditEntities.stop = new URL(page.url()).searchParams.get('stopId') ?? '';
  await page.getByRole('button', { name: 'Tôi đã đến điểm', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận đã bàn giao', exact: true }).click();
  await expect(
    page.getByText('Đã lưu bàn giao tự khai. Chưa có điểm thưởng được cấp.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Đã lưu bàn giao tự khai. Chưa có điểm thưởng được cấp.', { exact: true }),
  ).toBeVisible();
});

test('saved calendar selects real dates and registration issues a persistent ticket', async ({
  page,
  request,
}) => {
  await login(page);
  const response = await request.get(`${api}/v1/events/${env.BLUESTEPS_E2E_EVENT_ID}`);
  expect(response.ok()).toBe(true);
  const event = await response.json();
  await page.goto(`/events/${env.BLUESTEPS_E2E_OVERLAP_ID}`);
  await page.getByRole('button', { name: 'Lưu hoạt động', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ lưu hoạt động', exact: true })).toBeVisible();
  await page.goto('/calendar');
  const timezone = (await page.getByText(/^Múi giờ: /).innerText()).replace('Múi giờ: ', '');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(event.startsAt));
  const part = (type: string) => Number(parts.find((item) => item.type === type)!.value);
  const monthHeading = `Tháng ${part('month')}, ${part('year')}`;
  if (!(await page.getByRole('heading', { name: monthHeading, exact: true }).count()))
    await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
  await page
    .getByRole('button', {
      name: new RegExp(
        `^Ngày ${part('day')} tháng ${part('month')} năm ${part('year')}, 2 hoạt động đã lưu$`,
      ),
    })
    .click();
  await expect(page.getByRole('button', { name: event.title, exact: true })).toBeVisible();
  await expect(page.getByText('Có hoạt động đang trùng giờ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tuần', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Ngày \d+ tháng \d+ năm \d{4}/ })).toHaveCount(7);
  await expect(page.getByRole('button', { name: event.title, exact: true })).toBeVisible();
  const directory = join(process.cwd(), '../../docs/ui-implementation-2026-11-01/live-visual');
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: join(directory, 'calendar-week-selected.png') });
  await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
  await expect(
    page.getByText('Chưa có hoạt động đã lưu trong ngày này', { exact: true }),
  ).toBeVisible();
  await page.goto(`/registration?id=${event.id}`);
  await expect(
    page.getByRole('textbox', { name: 'Họ và tên người tham gia', exact: true }),
  ).toHaveValue(alice);
  await page.getByRole('button', { name: 'Tăng số người', exact: true }).click();
  await expect(page.getByText('2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận đăng ký • Miễn phí', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chọn vai trò');
  await page.getByRole('button', { name: 'Chọn vai trò tình nguyện', exact: true }).click();
  await page.getByRole('radio', { name: 'Tình nguyện viên', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Số điện thoại người tham gia', exact: true })
    .fill('0901234567');
  await page.getByRole('checkbox').nth(0).click();
  await page.getByRole('checkbox').nth(1).click();
  const registration = page.waitForResponse(
    (item) =>
      item.url().endsWith(`/v1/events/${event.id}/registrations`) &&
      item.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Xác nhận đăng ký • Miễn phí', exact: true }).click();
  expect((await registration).status()).toBe(201);
  await expect(page).toHaveURL(new RegExp(`/event-ticket\\?id=${event.id}`));
  await expect(page.getByRole('img', { name: /^Mã QR vé BS-/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: /^Mã QR vé BS-/ })).toBeVisible();
  await page.getByRole('button', { name: 'Thông tin đăng ký', exact: true }).click();
  await expect(page.getByText('2 người · Tình nguyện viên', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Lưu vé vào thiết bị', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^BS-.*\.png$/);
});

test('ticket and summary render participation state without fabricating results', async ({
  page,
}) => {
  await login(page);
  await page.goto(`/event-reminders?events=${env.BLUESTEPS_E2E_EVENT_ID}`);
  await expect(page.getByRole('heading', { name: 'Cài đặt nhắc lịch', exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: env.BLUESTEPS_E2E_EVENT_NAME!, exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('switch')).toHaveCount(4);
  await page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }).click();
  await page.getByRole('button', { name: '3 giờ', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu cài đặt nhắc lịch', exact: true }).click();
  await expect(page.getByText('Đã lưu cài đặt nhắc lịch.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('button', { name: '3 giờ', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto(`/event-ticket?id=${env.BLUESTEPS_E2E_EVENT_ID}`);
  await expect(page.getByRole('img', { name: /^Mã QR vé BS-/ })).toBeVisible();
  await expect(page.getByText(env.BLUESTEPS_E2E_EVENT_NAME!, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Lưu vé vào thiết bị', exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Gọi ban tổ chức', exact: true })).toBeDisabled();
  await page.goto(`/event-summary?id=${env.BLUESTEPS_E2E_EVENT_ID}`);
  await expect(page.getByText('—', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Gửi đánh giá', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('textbox', { name: 'Chia sẻ cảm nhận', exact: true }),
  ).not.toBeEditable();
  await expect(page.getByText('200', { exact: true })).toHaveCount(0);
});

test('offline reads fail visibly without demo fallback and service gates are real API errors', async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto('/articles');
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('textbox', { name: 'Tìm bài viết', exact: true }).fill('offline');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole('textbox', { name: 'Tìm bài viết', exact: true }).fill('');
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
  await page.goto('/assistant');
  await page
    .getByRole('textbox', { name: 'Câu hỏi của bạn', exact: true })
    .fill('Hướng dẫn phân loại');
  await page.getByRole('button', { name: 'Kết nối trợ lý', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa cấu hình');
  await page.goto('/game');
  await expect(page.getByRole('alert')).toContainText('chưa được mở');
});

test('settings and onboarding choices persist across full reloads', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Âm thanh và rung', exact: true }).click();
  await page.getByRole('switch', { name: 'Âm thanh', exact: true }).click();
  await page.getByRole('switch', { name: 'Rung', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Thử âm thanh và rung', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await page.getByRole('button', { name: /^Múi giờ ·/ }).click();
  await page.getByRole('textbox', { name: 'Múi giờ IANA', exact: true }).fill('Asia/Bangkok');
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/v1/me/preferences') && response.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Lưu múi giờ', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: /^Múi giờ ·/ }).click();
  await expect(page.getByRole('textbox', { name: 'Múi giờ IANA', exact: true })).toHaveValue(
    'Asia/Bangkok',
  );
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Âm thanh và rung', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Âm thanh', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.goto('/onboarding');
  await page.getByRole('checkbox', { name: 'Điểm thu gom', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('radio', { name: 'Giảm đồ nhựa dùng một lần', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn mục tiêu này', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu lựa chọn', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/onboarding');
  await expect(page.getByRole('checkbox', { name: 'Điểm thu gom', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(
    page.getByRole('radio', { name: 'Giảm đồ nhựa dùng một lần', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
});

test('daily points, redemption and refund persist through the complete reward flow', async ({
  page,
}) => {
  await login(page);
  await page.goto('/rewards/catalog');
  await page.getByRole('button', { name: 'Đồ tái chế', exact: true }).click();
  await expect(page.getByText('Còn 7', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_REWARD_NAME!, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/rewards/${env.BLUESTEPS_E2E_REWARD_ID}$`));
  await page.getByRole('button', { name: 'Đổi quà', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đổi ngay', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.goto('/rewards/catalog');
  await page.getByRole('button', { name: 'Nhắc tôi điểm danh', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications\?view=settings$/);
  await page.getByRole('switch', { name: 'Nhắc tôi điểm danh', exact: true }).click();
  await expect(page.getByText('Đã lưu cài đặt thông báo.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Nhắc tôi điểm danh', exact: true })).toBeChecked();
  await page.goto('/rewards/catalog');
  const claim = page.waitForResponse(
    (response) =>
      response.url().endsWith('/v1/me/daily-claims') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Điểm danh', exact: true }).click();
  expect((await claim).status()).toBe(200);
  await expect(page.getByText('Bạn nhận được 2 điểm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông báo nhận điểm', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Quay lại ngày mai nhé', exact: true }),
  ).toBeDisabled();
  for (let count = 0; count < 7; count++) {
    await page.goto(`/handbook/${env.BLUESTEPS_E2E_WASTE_ID}`);
    await page.getByRole('button', { name: 'Ghi nhận đã phân loại', exact: true }).click();
    await expect(
      page.getByText('Đã lưu hành động. Điểm thưởng: 5.', { exact: true }),
    ).toBeVisible();
  }
  await page.goto(`/rewards/${env.BLUESTEPS_E2E_REWARD_ID}`);
  await expect(page.getByText('Số dư của bạn: 42 điểm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đổi quà', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi ngay', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CHÚC MỪNG', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nhận ngay', exact: true }).click();
  await expect(page.getByText('Đã giữ quà · chờ nhận', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Hủy đổi quà', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy đổi quà', exact: true }).click();
  await expect(page.getByText('Đã hủy và hoàn điểm', { exact: true })).toBeVisible();
  await page.goto('/rewards');
  await expect(page.getByText('42 điểm', { exact: true })).toBeVisible();
});

test('news calendar, dated briefs, reading state and search history persist', async ({ page }) => {
  await login(page);
  await page.goto('/articles/calendar');
  await expect(page.getByRole('heading', { name: 'Lịch sự kiện', exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+ hoạt động sắp tới$/)).toBeVisible();
  const activity = page.getByRole('button', { name: env.BLUESTEPS_E2E_EVENT_NAME!, exact: true });
  if (!(await activity.isVisible()))
    await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
  await expect(activity).toBeVisible();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-calendar.png'), fullPage: true });
  await page.goto(`/articles/events/${env.BLUESTEPS_E2E_OVERLAP_ID}`);
  await page.getByRole('button', { name: 'Bỏ lưu hoạt động', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu hoạt động', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đã ghi nhận sự quan tâm', exact: true }),
  ).toBeVisible();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-interest.png'), fullPage: true });
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await page.goto('/articles/briefs');
  await expect(page.getByRole('heading', { name: 'Bản tin nhanh', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-briefs.png'), fullPage: true });
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }).click();
  const markRead = page.getByRole('button', { name: 'Đánh dấu đã đọc', exact: true });
  await expect(page.getByRole('button', { name: /^(Đánh dấu đã đọc|Đã đọc)$/ })).toBeVisible();
  if (await markRead.isVisible()) await markRead.click();
  await expect(page.getByRole('button', { name: 'Đã đọc', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Danh sách đọc', exact: true }).click();
  await expect(page.getByText('Bạn đã lưu 1 bài viết', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Đã đọc', exact: true }).click();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toBeVisible();
  await page.reload();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-reading-list.png'), fullPage: true });
  await page.goto('/articles/search');
  await page
    .getByRole('textbox', { name: 'Tìm bài viết', exact: true })
    .fill(env.BLUESTEPS_E2E_ARTICLE_NAME!);
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: `Kết quả cho “${env.BLUESTEPS_E2E_ARTICLE_NAME}”`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xóa lịch sử tìm kiếm', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole('button', { name: env.BLUESTEPS_E2E_ARTICLE_NAME!, exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: '30 ngày', exact: true }).click();
  await page.getByRole('button', { name: 'Xem dạng lưới →', exact: true }).click();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-search-grid.png'), fullPage: true });
  await page.getByRole('button', { name: 'Xóa lịch sử tìm kiếm', exact: true }).click();
  await expect(page.getByText('Chưa có tìm kiếm gần đây', { exact: true })).toBeVisible();
  await page.goto('/articles/topics');
  await page.getByRole('button', { name: 'Theo dõi chủ đề Kết nối', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi chủ đề Kết nối', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi chủ đề Kết nối', exact: true }),
  ).toBeVisible();
  if (auditOutput)
    await page.screenshot({ path: join(auditOutput, 'news-topics.png'), fullPage: true });
  await page.getByRole('button', { name: 'Chủ đề Kết nối', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/search\?topic=/);
});

test('statistics targets and achievements use measured self-reports and opt-in ranking', async ({
  page,
}) => {
  await login(page);
  await page.goto('/statistics');
  await expect(page.getByText('8 lượt phân loại', { exact: true })).toBeVisible();
  await expect(page.getByText('1,25 kg tự ghi nhận', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Theo kg tự khai', exact: true }).click();
  await page.getByRole('button', { name: '30 ngày', exact: true }).click();
  await expect(page.getByText('8 lần/30 ngày', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm mục tiêu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tên mục tiêu', exact: true })
    .fill(`Mười hành động ${run}`);
  await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click();
  await expect(page.getByText('8/10 lượt · Đang thực hiện', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Sửa mục tiêu', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mục tiêu (số lượt)', exact: true }).fill('8');
  await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click();
  await expect(page.getByText('8/8 lượt · Hoàn thành', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu trữ mục tiêu', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ mục tiêu', exact: true }).click();
  await expect(page.getByText(`Mười hành động ${run}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu trữ mục tiêu', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận lưu trữ', exact: true }).click();
  await expect(page.getByText(`Mười hành động ${run}`, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Thêm mục tiêu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tên mục tiêu', exact: true })
    .fill(`Thu gom 2 kg ${run}`);
  await page.getByRole('button', { name: 'Khối lượng tự ghi nhận (kg)', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mục tiêu (kg tự ghi nhận)', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Lưu mục tiêu', exact: true }).click();
  await expect(page.getByText('1,25/2 kg · Đang thực hiện', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kỳ trước', exact: true }).click();
  await expect(page.getByText('0 lượt phân loại', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kỳ sau', exact: true }).click();
  await expect(page.getByText('8 lượt phân loại', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem thành tích và bảng xếp hạng', exact: true }).click();
  await page.getByRole('button', { name: 'Tham gia bảng xếp hạng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rời bảng xếp hạng', exact: true })).toBeVisible();
  await expect(page.getByText('Cấp 1 · Hạng 1', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Rời bảng xếp hạng', exact: true })).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page, 'BOB');
  await page.goto('/achievements');
  await page.getByRole('button', { name: 'Tham gia bảng xếp hạng', exact: true }).click();
  await expect(page.getByText('Cấp 1 · Hạng 2', { exact: true })).toBeVisible();
  await expect(page.getByText(alice, { exact: true })).toBeVisible();
});

test('community discovery follows, topics, saved and hidden posts survive reload and blocks', async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const body = `Bài cộng đồng ${run}`;
  const topic = `Tái chế ${run}`;
  const capture = async (name: string) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (auditOutput)
        await page.screenshot({
          path: join(auditOutput, `community-${name}-${viewport.width}.png`),
          animations: 'disabled',
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  await login(page, 'BOB');
  await page.goto('/compose');
  await page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true }).fill(body);
  await page
    .getByRole('textbox', { name: 'Chủ đề bài viết (không bắt buộc)', exact: true })
    .fill(topic);
  await page.getByRole('button', { name: 'Đăng bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Xem bài viết', exact: true }).click();
  await expect(page).toHaveURL(/\/discussion\?id=/);
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  const postUrl = page.url();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page);
  await page.goto('/community?view=members');
  await page.getByRole('textbox', { name: 'Tìm kiếm cộng đồng', exact: true }).fill(bob);
  await expect(page.getByRole('button', { name: bob, exact: true })).toBeVisible();
  await capture('members');
  await page.getByRole('button', { name: bob, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Trang thành viên', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Theo dõi', exact: true }).click();
  await expect(page.getByText('1 người theo dõi', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '✓ Đang theo dõi', exact: true })).toBeVisible();
  await capture('member-followed');
  await page.goto('/community?view=following');
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thích', exact: true }).click();
  await expect(page.getByText('1 lượt thích · 0 bình luận', { exact: true })).toBeVisible();
  await page.goto('/community?view=topics');
  await page.getByRole('textbox', { name: 'Tìm kiếm cộng đồng', exact: true }).fill(run);
  await page.getByRole('button', { name: topic, exact: true }).click();
  await expect(page.getByText(`Chủ đề: ${topic}`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await capture('topic-posts');
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await capture('options');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Sao chép liên kết', exact: true }).click();
  await expect(page.getByText('Đã sao chép liên kết', { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(copied).searchParams.get('id')).toBe(new URL(postUrl).searchParams.get('id'));
  await page.getByRole('button', { name: 'Lưu bài đăng', exact: true }).click();
  await page.goto('/community?view=saved');
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Ẩn bài đăng', exact: true }).click();
  await expect(page.getByText('Chưa có bài viết', { exact: true })).toBeVisible();
  await page.goto('/community?view=following');
  await expect(page.getByText(body, { exact: true })).toHaveCount(0);
  await page.goto('/community?view=hidden');
  await page.reload();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện lại bài đăng', exact: true }).click();
  await expect(page.getByText('Chưa có bài viết đã ẩn', { exact: true })).toBeVisible();
  await page.goto('/community?view=saved');
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Bỏ lưu bài đăng', exact: true }).click();
  await expect(page.getByText('Chưa có bài viết', { exact: true })).toBeVisible();
  await page.goto('/community?view=members&q=' + encodeURIComponent(bob));
  await page.getByRole('button', { name: bob, exact: true }).click();
  await page.getByRole('button', { name: 'Chặn thành viên', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận chặn thành viên', exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await page.goto(postUrl);
  await expect(page.getByRole('alert').first()).toContainText('Không tìm thấy');
  await page.goto('/community?view=members&q=' + encodeURIComponent(bob));
  await expect(page.getByText('Chưa tìm thấy thành viên', { exact: true })).toBeVisible();
  await page.goto('/community?view=blocked');
  await page.reload();
  await page.getByRole('button', { name: `Bỏ chặn ${bob}`, exact: true }).click();
  await expect(page.getByText('Chưa có thành viên đã chặn', { exact: true })).toBeVisible();
  await page.goto('/community?view=members&q=' + encodeURIComponent(bob));
  await page.getByRole('button', { name: bob, exact: true }).click();
  await expect(page.getByRole('button', { name: '+ Theo dõi', exact: true })).toBeVisible();
});

test('composer media draft, preview and accepted friends preserve private files across reload', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  const body = `Nội dung bản nháp ${run}`;
  const capture = async (name: string) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (auditOutput)
        await page.screenshot({
          path: join(auditOutput, `composer-${name}-${viewport.width}.png`),
          animations: 'disabled',
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  // Encoded and decoded by the isolated Python fixture, without camera/microphone or remote media.
  const clip = readFileSync(env.BLUESTEPS_E2E_VIDEO_PATH!);
  if (auditOutput) {
    mkdirSync(auditOutput, { recursive: true });
    writeFileSync(join(auditOutput, 'fixture-clip.webm'), clip);
  }
  await page.goto('/compose');
  await page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true }).fill(body);
  await page.getByRole('button', { name: 'Công khai', exact: true }).click();
  await page.getByRole('button', { name: 'Bạn bè', exact: true }).click();
  await page.getByRole('button', { name: 'Cảm xúc', exact: true }).click();
  await page.getByRole('button', { name: '😊 Hạnh phúc', exact: true }).click();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm địa điểm', exact: true }).fill(run);
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_POINT_NAME!, exact: true }).click();
  const chooseMedia = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Ảnh/Video', exact: true }).click();
  await (
    await chooseMedia
  ).setFiles([
    {
      name: 'picked.png',
      mimeType: 'image/png',
      buffer: readFileSync(join(process.cwd(), 'assets/images/scan/leaf.png')),
    },
    { name: 'clip.webm', mimeType: 'video/webm', buffer: clip },
  ]);
  await expect(page.getByRole('button', { name: 'Gỡ tệp picked.png', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gỡ tệp clip.webm', exact: true })).toBeVisible();
  const chooseFiles = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn nhiều file', exact: true }).click();
  await (
    await chooseFiles
  ).setFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`attachment ${run}`),
  });
  await expect(page.getByRole('button', { name: 'Gỡ tệp note.txt', exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải tệp note.txt', exact: true }).click();
  const download = await downloadEvent;
  expect(readFileSync((await download.path())!, 'utf8')).toBe(`attachment ${run}`);
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu bản nháp trong tài khoản', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    body,
  );
  await expect(page.getByText('😊 Hạnh phúc', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gỡ tệp picked.png', exact: true })).toBeVisible();
  await capture('restored');
  const video = page.locator('video').first();
  if (auditOutput)
    writeFileSync(
      join(auditOutput, 'video-diagnostics.json'),
      JSON.stringify(
        await video.evaluate(async (element) => {
          const video = element as HTMLVideoElement;
          const blob = await (await fetch(video.src)).blob();
          return {
            readyState: video.readyState,
            error: video.error?.message,
            source: video.src,
            mime: blob.type,
            bytes: blob.size,
            capability: video.canPlayType('video/webm;codecs=vp8'),
          };
        }),
        null,
        2,
      ),
    );
  await expect
    .poll(() => video.evaluate((element) => (element as HTMLVideoElement).readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (element) => {
    (element as HTMLVideoElement).muted = true;
    await (element as HTMLVideoElement).play();
  });
  await expect
    .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await video.evaluate((element) => (element as HTMLVideoElement).pause());
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Xem trước bài viết', exact: true }),
  ).toBeVisible();
  await capture('preview');
  await page.getByRole('button', { name: 'Đăng bài viết từ xem trước', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem bài viết', exact: true })).toBeVisible();
  await capture('published');
  await page.getByRole('button', { name: 'Xem bài viết', exact: true }).click();
  await expect(page).toHaveURL(/\/discussion\?id=/);
  const postUrl = page.url();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await page.goto('/community?view=members&q=' + encodeURIComponent(bob));
  await page.getByRole('button', { name: bob, exact: true }).click();
  await page.getByRole('button', { name: 'Kết bạn', exact: true }).click();
  await expect(page.getByText('Đã gửi lời mời kết bạn', { exact: true })).toBeVisible();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page, 'BOB');
  await page.goto('/compose');
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByRole('button', { name: 'Gỡ tệp picked.png', exact: true })).toHaveCount(0);
  await page.goto(postUrl);
  await expect(page.getByRole('alert').first()).toContainText('Không tìm thấy');
  await page.goto('/community?view=friends&friend_state=incoming');
  await page.getByRole('button', { name: 'Chấp nhận kết bạn', exact: true }).click();
  await page.goto(postUrl);
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Ảnh bài viết picked.png', exact: true }),
  ).toBeVisible();
  await capture('friend-read');
  await page.goto('/community?view=members&q=' + encodeURIComponent(alice));
  await page.getByRole('button', { name: alice, exact: true }).click();
  await page.getByRole('button', { name: 'Hủy kết bạn', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy kết bạn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kết bạn', exact: true })).toBeVisible();
  await page.goto(postUrl);
  await expect(page.getByRole('alert').first()).toContainText('Không tìm thấy');
});

test('handbook category handling, material variants and Dos/Donts persist through navigation', async ({
  page,
}) => {
  await login(page);
  await page.goto('/handbook');
  const mutations: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && path === '/v1/sorting-actions') mutations.push(path);
  });
  const capture = async (name: string) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (auditOutput)
        await page.screenshot({
          path: join(auditOutput, `handbook-${name}-${viewport.width}.png`),
        });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  await page.getByRole('button', { name: 'Rác tái chế', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vật phẩm trong nhóm', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cách xử lý Rác tái chế', exact: true }).click();
  await expect(page.getByText('Cách xử lý:', { exact: true })).toBeVisible();
  await capture('category-expanded');
  await page.reload();
  await expect(page.getByText('Cách xử lý:', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng cách xử lý', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm vật phẩm', exact: true }).fill(run);
  await page.getByRole('button', { name: env.BLUESTEPS_E2E_WASTE_NAME!, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: env.BLUESTEPS_E2E_WASTE_NAME!, exact: true }),
  ).toBeVisible();
  await page.getByRole('switch', { name: 'Xem điều không nên làm', exact: true }).click();
  await expect(
    page.getByText('1. Không trộn pin vào vật phẩm tái chế.', { exact: true }),
  ).toBeVisible();
  await capture('donts');
  await page.reload();
  await expect(
    page.getByRole('switch', { name: 'Xem điều không nên làm', exact: true }),
  ).toBeChecked();
  await page.getByRole('switch', { name: 'Xem điều không nên làm', exact: true }).click();
  await expect(
    page.getByText('1. Hướng dẫn từ dữ liệu đã công bố.', { exact: true }),
  ).toBeVisible();
  await capture('dos');
  await page.getByRole('button', { name: 'Tìm hiểu về Nhựa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chi tiết PET', exact: true })).toBeVisible();
  await capture('plastic');
  await page.getByRole('button', { name: 'Chi tiết PET', exact: true }).click();
  await expect(page.getByText('Ví dụ: Chai đồ uống', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Ví dụ: Chai đồ uống', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tra vật phẩm PET', exact: true }).click();
  await expect(page).toHaveURL(/\/handbook\/list\?kind=plastic&query=PET/);
  await expect(
    page.getByRole('button', { name: `Chai nhựa PET ${run}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: env.BLUESTEPS_E2E_WASTE_NAME!, exact: true }),
  ).toHaveCount(0);
  for (const [kind, title] of [
    ['medical', 'Phân loại chất thải y tế'],
    ['bag', 'Các loại túi và màng phổ biến'],
    ['battery', 'Các loại pin thường gặp'],
  ]) {
    await page.goto(`/handbook/types/${kind}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await capture(kind!);
    await expect(page.getByText(/450.*500 năm/)).toHaveCount(0);
  }
  expect(mutations).toHaveLength(0);
});

test('a chosen photo follows model recognition, explicit reward, reload and owner checks', async ({
  page,
}) => {
  await login(page, 'BOB');
  await page.goto('/scan');
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && ['/v1/scans', '/v1/sorting-actions'].includes(path))
      writes.push({ path, body: request.postDataJSON() });
  });
  const predictionResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/v1/scans/recognize',
  );
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'leaf.png',
    mimeType: 'image/png',
    buffer: readFileSync(join(process.cwd(), 'assets/images/scan/leaf.png')),
  });
  const prediction = await (await predictionResponse).json();
  expect(prediction.status).toBe('completed');
  expect(prediction.resultItem.code).toBe(`scan-${prediction.predictedClass}`);
  await expect(page.getByRole('heading', { name: 'Quét thành công!', exact: true })).toBeVisible();
  if (auditOutput) await page.screenshot({ path: join(auditOutput, 'scan-success-390.png') });
  await expect(page.getByRole('button', { name: 'Xem kết quả', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: prediction.resultLabel, exact: true }),
  ).toBeVisible();
  const capture = async (name: string) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width + 1,
      );
      if (auditOutput)
        await page.screenshot({ path: join(auditOutput, `scan-${name}-${viewport.width}.png`) });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  await capture('photo');
  await expect(page.getByRole('tab', { name: 'Trang chủ', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả quét rác', exact: true })).toBeVisible();
  await capture('details');
  await expect(page.getByRole('tab', { name: 'Trang chủ', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Tích điểm xanh', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Xác nhận phân loại', exact: true }),
  ).toBeVisible();
  await capture('confirm');
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();
  expect(writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Tích điểm xanh', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Khối lượng đã cân (kg, không bắt buộc)', exact: true })
    .fill('0,25');
  await page.getByRole('button', { name: 'Xác nhận đã phân loại', exact: true }).click();
  await expect(page.getByText('Bạn nhận được 5 điểm', { exact: true })).toBeVisible();
  await capture('reward');
  expect(writes.map((item) => item.path)).toEqual(['/v1/scans', '/v1/sorting-actions']);
  expect(Object.keys(writes[0]!.body).sort()).toEqual([
    'clientImageId',
    'inputKind',
    'predictionToken',
  ]);
  expect(writes[1]!.body.source).toBe('scan');
  const savedUrl = page.url();
  expect(savedUrl).toContain('scanId=');
  await page.getByRole('button', { name: 'Đóng kết quả nhận điểm', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Lần quét này đã được xác nhận.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem kết quả nhận điểm', exact: true }).click();
  await expect(page.getByText('Bạn nhận được 5 điểm', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
  await capture('restored');
  await page.getByRole('button', { name: 'Đóng kết quả nhận điểm', exact: true }).click();
  await page.getByRole('button', { name: /^Xem điểm thu gom/ }).click();
  await expect(page).toHaveURL(/\/collection\?materials=.*matchMode=all/);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await login(page);
  await page.goto(savedUrl);
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy');
  await expect(page.getByText('Bạn nhận được 5 điểm', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Quét lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Phân loại rác', exact: true })).toBeVisible();
});

test('every application route renders with the live provider', async ({ page }) => {
  test.setTimeout(240_000);
  await login(page);
  function routeFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? routeFiles(join(directory, entry.name)) : [join(directory, entry.name)],
    );
  }
  const root = join(process.cwd(), 'app');
  const routes = routeFiles(root).filter(
    (file) => file.endsWith('.tsx') && !/(_layout|\+not-found)\.tsx$/.test(file),
  );
  expect(routes.length).toBeGreaterThanOrEqual(66);
  const auditRows: object[] = [];
  if (auditOutput) mkdirSync(join(auditOutput, 'routes'), { recursive: true });
  for (const file of routes) {
    let path = file
      .slice(root.length)
      .replaceAll('\\', '/')
      .replace(/\.tsx$/, '')
      .replace('/(tabs)', '')
      .replace(/\/index$/, '');
    const id =
      path.startsWith('/articles/events') || path.startsWith('/events')
        ? env.BLUESTEPS_E2E_EVENT_ID!
        : path.startsWith('/articles')
          ? env.BLUESTEPS_E2E_ARTICLE_ID!
          : path.startsWith('/handbook')
            ? env.BLUESTEPS_E2E_WASTE_ID!
            : path.startsWith('/points')
              ? env.BLUESTEPS_E2E_POINT_ID!
              : path.startsWith('/rewards')
                ? env.BLUESTEPS_E2E_REWARD_ID!
                : '00000000-0000-4000-8000-000000000000';
    path = path.replace('[id]', id).replace('[category]', 'recycle').replace('[kind]', 'plastic');
    const params = new URLSearchParams();
    if (['/registration', '/event-ticket', '/event-summary'].includes(path))
      params.set('id', env.BLUESTEPS_E2E_EVENT_ID!);
    if (path === '/event-reminders') params.set('events', env.BLUESTEPS_E2E_EVENT_ID!);
    if (['/articles/discussion'].includes(path)) params.set('id', env.BLUESTEPS_E2E_ARTICLE_ID!);
    if (path === '/discussion' && auditEntities.post) params.set('id', auditEntities.post);
    if (path === '/conversation' && auditEntities.conversation)
      params.set('id', auditEntities.conversation);
    if (
      path.startsWith('/collection-') &&
      !['/collection-filters', '/collection-explore', '/collection-compare'].includes(path) &&
      auditEntities.route
    )
      params.set('id', auditEntities.route);
    if (path === '/collection-arrival' && auditEntities.stop)
      params.set('stopId', auditEntities.stop);
    if (path === '/point-report') params.set('id', env.BLUESTEPS_E2E_POINT_ID!);
    if (path === '/collection-compare') params.set('ids', env.BLUESTEPS_E2E_POINT_ID!);
    if (params.size) path += '?' + params.toString();
    await page.goto(path || '/');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText('Chào Linh Chi!', { exact: true })).toHaveCount(0);
    await expect(page.getByText('180 điểm', { exact: true })).toHaveCount(0);
    if (auditOutput) {
      await expect(page.getByText('Đang tải dữ liệu…', { exact: true })).toHaveCount(0, {
        timeout: 30_000,
      });
      const details = await page.evaluate(() => ({
        headings: [...document.querySelectorAll('[role="heading"]')].map(
          (element) => element.textContent,
        ),
        buttons: [...document.querySelectorAll('[role="button"],button')].map((element) => ({
          label: element.getAttribute('aria-label') ?? element.textContent,
          disabled:
            element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'),
        })),
        alerts: [...document.querySelectorAll('[role="alert"]')].map(
          (element) => element.textContent,
        ),
        text: document.body.innerText,
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      const screenshot = `routes/${String(auditRows.length + 1).padStart(2, '0')}-${(path.split('?')[0] ?? '').replaceAll('/', '_') || 'home'}.png`;
      await page.screenshot({ path: join(auditOutput, screenshot), fullPage: true });
      auditRows.push({
        route: path || '/',
        source: file.slice(root.length),
        screenshot,
        ...details,
      });
      writeFileSync(join(auditOutput, 'runtime-routes.json'), JSON.stringify(auditRows, null, 2));
    }
  }
});

test('Figma layout candidates render at both mobile widths with database content', async ({
  page,
}) => {
  test.setTimeout(300_000);
  await login(page);
  const directory =
    auditOutput ?? join(process.cwd(), '../../docs/ui-implementation-2026-11-01/live-visual');
  mkdirSync(directory, { recursive: true });
  const results: object[] = [];
  const screens = [
    ['home', '/'],
    ['profile', '/profile'],
    ['statistics', '/statistics'],
    ['achievements', '/achievements'],
    ['handbook', '/handbook'],
    ['news', '/articles'],
    ['news-calendar', '/articles/calendar'],
    ['news-briefs', '/articles/briefs'],
    ['news-reading', '/articles/reading-list'],
    ['news-search', '/articles/search'],
    ['news-topics', '/articles/topics'],
    ['events', '/events'],
    ['event-detail', `/events/${env.BLUESTEPS_E2E_EVENT_ID}`],
    ['event-registration', `/registration?id=${env.BLUESTEPS_E2E_EVENT_ID}`],
    ['event-calendar', '/calendar'],
    ['event-collections', '/event-collections'],
    ['event-reminders', `/event-reminders?events=${env.BLUESTEPS_E2E_EVENT_ID}`],
    ['event-ticket', `/event-ticket?id=${env.BLUESTEPS_E2E_EVENT_ID}`],
    ['event-summary', `/event-summary?id=${env.BLUESTEPS_E2E_EVENT_ID}`],
    ['collection', '/collection'],
    ['settings', '/settings'],
    ['settings-sound', '/settings?overlay=sound'],
    ['settings-search', '/settings?overlay=search'],
    ['settings-history', '/settings?overlay=history'],
    ['settings-pin', '/settings?overlay=pin'],
    ['edit-profile', '/edit-profile'],
    ['change-password', '/change-password'],
    ['forgot-password', '/forgot-password'],
    ['rewards', '/rewards'],
    ['reward-catalog', '/rewards/catalog'],
    ['reward-history', '/history'],
    ['reward-guide', '/rewards/guide'],
    ['onboarding', '/onboarding?step=5'],
  ] as const;
  for (const viewport of [
    { width: 428, height: 926 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [name, route] of screens) {
      const mapTile =
        name === 'collection'
          ? page
              .waitForResponse(
                (response) =>
                  /tile\.openstreetmap\.org/.test(response.url()) && response.status() === 200,
                { timeout: 30000 },
              )
              .then(() => true)
              .catch(() => false)
          : null;
      await page.goto(route);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() =>
            Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
          ),
        )
        .toBe(true);
      await expect(page.getByRole('progressbar', { name: 'Đang tải', exact: true })).toHaveCount(0);
      const mapLoaded = mapTile ? await mapTile : null;
      if (mapLoaded)
        await expect(
          page.frameLocator('iframe[title="Bản đồ điểm thu gom"]').locator('canvas').first(),
        ).toBeVisible();
      if (name === 'reward-catalog')
        await expect(
          page.getByRole('button', { name: env.BLUESTEPS_E2E_REWARD_NAME!, exact: true }),
        ).toBeVisible();
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.width);
      await page.screenshot({ path: join(directory, `${name}-${viewport.width}.png`) });
      if (name === 'event-detail') {
        await page
          .getByRole('heading', { name: 'Hoạt động khác', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: join(directory, `event-detail-content-${viewport.width}.png`),
        });
      } else if (name === 'event-registration') {
        await page
          .getByRole('button', { name: 'Xác nhận đăng ký • Miễn phí', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: join(directory, `event-registration-bottom-${viewport.width}.png`),
        });
      } else if (name === 'event-calendar') {
        await page.getByRole('button', { name: /^Xem hoạt động ngày / }).scrollIntoViewIfNeeded();
        await page.screenshot({
          path: join(directory, `event-calendar-bottom-${viewport.width}.png`),
        });
      } else if (
        ['event-collections', 'event-reminders', 'event-ticket', 'event-summary'].includes(name)
      ) {
        const footerLabel =
          name === 'event-collections'
            ? 'Hủy chọn'
            : name === 'event-reminders'
              ? 'Về hoạt động yêu thích'
              : name === 'event-ticket'
                ? 'Thông tin đăng ký'
                : 'Khám phá hoạt động khác';
        await page.getByRole('button', { name: footerLabel, exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(directory, `${name}-bottom-${viewport.width}.png`) });
      }
      results.push({
        name,
        route,
        viewport,
        ...geometry,
        mapLoaded,
        source: 'isolated PostgreSQL API; no request mocking',
      });
    }
  }
  writeFileSync(join(directory, 'checks.json'), JSON.stringify(results, null, 2));
});

test('password recovery uses the real email code and permits login with the new password', async ({
  page,
}) => {
  const email = `registered-${run}@example.com`;
  const directory = env.BLUESTEPS_E2E_MAIL_DIR!;
  const existing = new Set(readdirSync(directory));
  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('button', { name: 'Gửi mã xác minh', exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
  let code = '';
  await expect
    .poll(() => {
      for (const file of readdirSync(directory)) {
        if (existing.has(file) || !file.endsWith('.json')) continue;
        const mail = JSON.parse(readFileSync(join(directory, file), 'utf8'));
        if (mail.to === email) {
          code = mail.code;
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  const codeInput = page.getByRole('textbox', { name: 'Mã xác minh', exact: true });
  await codeInput.click();
  await expect(codeInput).toBeFocused();
  await page.keyboard.type(code);
  await expect(codeInput).toHaveValue(code);
  await page.screenshot({
    path: join(process.cwd(), '../../docs/ui-implementation-2026-11-01/live-visual/otp-390.png'),
  });
  await page.getByRole('button', { name: 'Xác nhận mã', exact: true }).click();
  await expect(page).toHaveURL('/reset-password');
  await page.getByRole('textbox', { name: 'Mật khẩu mới', exact: true }).fill(`${password}-reset`);
  await page
    .getByRole('textbox', { name: 'Nhập lại mật khẩu', exact: true })
    .fill(`${password}-reset`);
  await page.screenshot({
    path: join(
      process.cwd(),
      '../../docs/ui-implementation-2026-11-01/live-visual/reset-password-390.png',
    ),
  });
  await page.getByRole('button', { name: 'Lưu mật khẩu', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(`${password}-reset`);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Chào Người mới ${run}!`, exact: true }),
  ).toBeVisible();
});
