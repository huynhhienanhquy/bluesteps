import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Opt-in read-through check against the configured development database, not a fixture server.
test.skip(process.env.BLUESTEPS_VERIFY_DISPLAY !== '1', 'Run after preparing member display data');
test.setTimeout(600_000);

test('published catalogs and selected member data render throughout the app', async ({
  page,
  context,
  request,
}) => {
  const root = resolve(__dirname, '../../..');
  const session = JSON.parse(
    readFileSync(resolve(root, 'apps/api/.local/display-qa-session.json'), 'utf8'),
  );
  const dataset = JSON.parse(
    readFileSync(resolve(root, 'docs/display-data-verification.json'), 'utf8'),
  );
  const api = 'http://127.0.0.1:8000';
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const get = async (path: string) => {
    const response = await request.get(api + path, { headers });
    expect(response.status(), path).toBe(200);
    return response.json();
  };
  const profile = await get('/v1/me');
  const conversations = await get('/v1/conversations');
  const routes = await get('/v1/me/routes');
  const publishedEvents = await get('/v1/events');
  await context.addCookies([
    {
      name: 'bluesteps_refresh',
      value: session.refreshToken,
      domain: '127.0.0.1',
      path: '/v1/auth/web',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const evidence = resolve(root, 'docs/display-data-evidence');
  mkdirSync(evidence, { recursive: true });
  const visits: { path: string; content: string }[] = [];
  async function visit(path: string, content: string, screenshot?: string) {
    await page.goto(path);
    await expect(page.getByText(content, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 45_000 });
    expect(errors, path).toEqual([]);
    visits.push({ path, content });
    if (screenshot) {
      await page.getByText(content, { exact: false }).first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(evidence, screenshot), fullPage: true });
    }
  }
  await visit('/', 'Hoạt động xanh', 'home.png');
  await expect(page.getByText(publishedEvents.items[0].title).first()).toBeVisible();
  await visit('/handbook/list', 'Chai nhựa', 'handbook.png');
  for (const [category, item] of [
    ['recycle', 'Chai nhựa'],
    ['organic', 'Vỏ rau củ'],
    ['inorganic', 'Túi ni lông'],
  ])
    await visit(`/handbook/category/${category}`, `${item}`);
  for (const [kind, item] of [
    ['plastic', 'Chai nhựa'],
    ['paper', 'Giấy và hộp carton'],
    ['battery', 'Pin đã qua sử dụng'],
    ['bag', 'Túi ni lông'],
    ['medical', 'Khẩu trang đã dùng'],
  ])
    await visit(`/handbook/types/${kind}`, `${item}`);
  await visit('/events', 'Ngày hội phân loại rác', 'events.png');
  await visit('/articles', 'Bắt đầu phân loại rác tại nhà', 'articles.png');
  await visit('/collection', 'Điểm thu gom Hải Châu', 'collection.png');
  await visit('/rewards/catalog', 'Túi vải tái sử dụng', 'rewards.png');
  await expect
    .poll(() =>
      page
        .locator('img[src*="imgRectangle30"]')
        .evaluateAll((images) =>
          images.some(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await visit('/community', 'Cùng chia sẻ một thói quen xanh hôm nay nhé!');
  await visit('/saved', 'Ngày hội phân loại rác', 'saved-events.png');
  await visit('/articles/saved', 'Bắt đầu phân loại rác tại nhà');
  await visit('/articles/topics', 'Phân loại rác');
  await visit('/event-collections', 'Bộ sưu tập xanh', 'collections.png');
  await visit('/notifications', 'Chào mừng đến BlueSteps', 'notifications.png');
  await visit('/messages', 'An', 'messages.png');
  await visit(
    `/conversation?id=${conversations.items[0].id}`,
    'Chào bạn! Cùng tìm hiểu cách phân loại rác nhé.',
  );
  await visit('/history', 'Cộng điểm minh họa', 'history.png');
  await visit('/statistics', 'Hành động phân loại đã tự ghi nhận', 'statistics.png');
  await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
  await visit('/journey', 'Hành trình đã lưu');
  await visit(`/collection-route?id=${routes.items[0].id}`, 'Điểm thu gom Hải Châu');
  await visit('/profile', profile.displayName, 'profile.png');
  for (const [resource, path, content] of [
    ['articles', '/articles/', 'Chuẩn bị các ngăn chứa riêng'],
    ['events', '/events/', 'Cùng thực hành sống xanh'],
    ['collection_points', '/points/', 'không phải điểm tiếp nhận thực tế'],
    ['rewards', '/rewards/', 'Quà minh họa cho lối sống xanh'],
    ['waste_items', '/handbook/', 'Đổ hết chất lỏng còn lại.'],
  ] as const)
    await visit(path + dataset.catalog_ids[resource][0], content);
  const events = await get('/v1/me/saved-events');
  const eventDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(events.items[0].startsAt));
  await visit(`/saved?date=${eventDate}`, events.items[0].title);
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(root, 'docs/display-browser-verification.json'),
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        screens_passed: visits.length,
        page_errors: errors,
        visits,
      },
      null,
      2,
    ) + '\n',
  );
});
