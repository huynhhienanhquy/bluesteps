import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Schemas } from '../src/services/api';

// Presentation coverage complements the separate real API/PostgreSQL suite.
// These fixtures exercise all three badge assets and all topic-card variants.
const createdAt = '2026-11-02T02:00:00Z';
const articles: Schemas['Article'][] = Array.from({ length: 3 }, (_, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  code: `layout-article-${index}`,
  title: `Câu chuyện xanh ${index + 1}`,
  summary:
    'Nội dung kiểm tra bố cục bản tin. Các đoạn chữ được hiển thị và tự xuống dòng theo chiều rộng màn hình.',
  topic: 'Tái chế',
  blocks: [],
  sources: [],
  synthetic: false,
  createdAt,
}));
const topics = ['Đại dương', 'Tái chế', 'Sống xanh', 'Cộng đồng', 'Môi trường'].map((name) => ({
  id: name,
  name,
  articleCount: 3,
  followed: false,
}));
const events: Schemas['GreenEvent'][] = articles.map((article, index) => ({
  id: article.id,
  code: `layout-event-${index}`,
  title: `Hoạt động xanh ${index + 1}`,
  description: 'Nội dung kiểm tra bố cục',
  location: 'Địa điểm công bố',
  topic: 'Tái chế',
  startsAt: `2026-11-0${index + 2}T02:00:00Z`,
  endsAt: `2026-11-0${index + 2}T04:00:00Z`,
  timezone: 'Asia/Ho_Chi_Minh',
  capacity: 10,
  reservedCount: 0,
  available: 10,
  details: {},
  version: 1,
  synthetic: false,
  createdAt,
}));
const directory = join(process.cwd(), '../../docs/figma-completion/news-layout-isolated');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.addInitScript(() => {
    if (window.top === window) localStorage.setItem('bluesteps.onboarding.v1', 'complete');
  });
  await page.route('**/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const json =
      path === '/v1/article-topics'
        ? { items: topics, nextCursor: null }
        : path === '/v1/articles'
          ? { items: articles, nextCursor: null }
          : path === '/v1/article-briefs'
            ? { date: '2026-11-02', timezone: 'Asia/Ho_Chi_Minh', items: articles }
            : path === '/v1/news-calendar'
              ? { month: '2026-11', timezone: 'Asia/Ho_Chi_Minh', upcoming: 3, items: events }
              : null;
    return route.fulfill(
      json
        ? { json }
        : {
            status: 401,
            json: { error: { code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập.' } },
          },
    );
  });
});

for (const width of [428, 390]) {
  test(`news assets, cards and navigation stay within ${width}px viewport`, async ({ page }) => {
    test.setTimeout(90_000);
    const height = width === 428 ? 926 : 844;
    await page.setViewportSize({ width, height });
    mkdirSync(directory, { recursive: true });
    for (const path of ['calendar', 'briefs', 'topics', 'search']) {
      await page.goto(`/articles/${path}`);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Đang tải', exact: true })).toHaveCount(0);
      const home = page.getByRole('tab', { name: 'Trang chủ', exact: true });
      // CSS transforms use fractional pixels at 390px; permit only rounding noise.
      await expect(home).toBeInViewport({ ratio: 0.999 });
      const bounds = await home.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(-0.5);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 0.5);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
          ),
        )
        .toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await page.screenshot({
        path: join(directory, `${path}-${width}.png`),
        animations: 'disabled',
      });
    }
  });
}
