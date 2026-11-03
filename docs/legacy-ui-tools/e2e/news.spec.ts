import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const evidence = resolve(__dirname, '../../../docs/ui-progress-evidence-2026-10-30');
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('news search combines Vietnamese terms, topics and ordering and recovers from empty results', async ({
  page,
}) => {
  await page.goto('/articles?view=search');
  await expect(
    page.getByRole('button', { name: 'Đọc Gom pin cũ thành một thói quen riêng', exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm bài viết', exact: true }).fill('PIN CU');
  await expect(page.getByText('1 kết quả phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm bài viết', exact: true }).fill('khong tim thay');
  await expect(page.getByText('Không tìm thấy bài viết phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn chủ đề', exact: true }).click();
  await page.getByRole('radio', { name: 'Cộng đồng', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Đọc / })).toHaveCount(4);
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await page.getByRole('button', { name: 'Sắp xếp tin tức', exact: true }).click();
  await page.getByRole('radio', { name: 'Phổ biến', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Đọc / }).first()).toHaveAccessibleName(
    'Đọc 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
  );
});

test('Home news opens the matching article and saved articles survive navigation and require removal confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', {
      name: '11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/articles\/daily-waste$/);
  await page.getByRole('button', { name: 'Lưu bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Xem bài viết đã lưu', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Bỏ lưu bài 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Giữ bài đã lưu', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Bỏ lưu bài 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Xác nhận bỏ lưu bài', exact: true }).click();
  await expect(page.getByText('Chưa có bài viết đã lưu', { exact: true })).toBeVisible();
});

test('article discussions validate input, support replies and isolate comments from other articles', async ({
  page,
}) => {
  await page.goto('/articles/small-steps');
  await page.getByRole('button', { name: 'Thảo luận bài viết · 1', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  await expect(
    page.getByText('Nhập nội dung thảo luận trước khi đăng.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Nội dung thảo luận bài viết', exact: true })
    .fill('Ý tưởng mới của mình');
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  await page.getByRole('button', { name: 'Trả lời Minh An · Mẫu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nội dung thảo luận bài viết', exact: true })
    .fill('Mình cũng thử đặt bình gần cửa');
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  await expect(page.getByText(/Trả lời Minh An · Mẫu:/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Thích bình luận của Minh An · Mẫu', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Bỏ thích bình luận của Minh An · Mẫu', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('4 lượt thích', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Xóa bình luận: Ý tưởng mới của mình', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xác nhận xóa bình luận', exact: true }).click();
  await expect(page.getByText('Ý tưởng mới của mình', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Về bài viết', exact: true }).click();
  await page
    .getByRole('button', { name: 'Đọc Mang theo đồ dùng lại khi ra ngoài', exact: true })
    .click();
  await page.getByRole('button', { name: 'Thảo luận bài viết · 0', exact: true }).click();
  await expect(page.getByText('Chưa có thảo luận cho bài viết', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Mình cũng thử đặt bình gần cửa', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
});

test('topic following persists through navigation and selecting another topic updates the feed', async ({
  page,
}) => {
  await page.goto('/articles?view=search');
  await page.getByRole('button', { name: 'Chủ đề', exact: true }).click();
  await page.getByRole('button', { name: 'Theo dõi Phân loại', exact: true }).click();
  await page.getByRole('button', { name: 'Xem chủ đề Phân loại', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Đọc / })).toHaveCount(3);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi Phân loại', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xem chủ đề Lối sống', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lối sống', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Đọc Bắt đầu sống xanh từ những điều nhỏ', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Đọc Gom pin cũ thành một thói quen riêng', exact: true }),
  ).toHaveCount(0);
});

test('briefs mark articles read locally and green calendar opens the correct event', async ({
  page,
}) => {
  await page.goto('/articles/briefs');
  await page.getByRole('button', { name: 'Chỉ tin chưa đọc trong màn này', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Đánh dấu đã đọc 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await expect(page.getByText('Không có tin phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem tất cả tin', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Đọc toàn bài Chuẩn bị cho một buổi thu gom cộng đồng',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/articles\/community-day$/);
  await page.goto('/articles/calendar');
  await page.getByRole('button', { name: 'Chọn ngày và lọc sự kiện', exact: true }).first().click();
  await page.getByRole('button', { name: 'Ngày 2 tháng 11', exact: true }).click();
  await expect(page.getByText('Chưa có sự kiện phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chọn ngày và lọc sự kiện', exact: true }).first().click();
  await page.getByRole('button', { name: 'Ngày 1 tháng 11, có sự kiện', exact: true }).click();
  await page
    .getByRole('button', { name: 'Xem sự kiện Một sáng sạch hơn cho biển', exact: true })
    .click();
  await expect(page).toHaveURL(/\/events\/beach$/);
});

test('news screens render without runtime errors or overflow at 390 and 428 px and handle missing deep links', async ({
  page,
}, testInfo) => {
  // Sixteen route/viewport captures include scrolling to lazy related-article images.
  test.setTimeout(60_000);
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 926 });
    for (const [path, name] of [
      ['/articles', 'news'],
      ['/articles?topic=Phân%20loại', 'news-filtered'],
      ['/articles/daily-waste', 'news-detail'],
      ['/articles/saved', 'news-saved'],
      ['/articles/discussion?id=small-steps', 'news-discussion'],
      ['/articles/topics', 'news-topics'],
      ['/articles/calendar', 'news-calendar'],
      ['/articles/briefs', 'news-briefs'],
    ]) {
      await page.goto(path!);
      await expect(
        page.getByRole('button', {
          name: path === '/articles' ? 'Đọc bài nổi bật' : 'Quay lại',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByLabel('Đang tải', { exact: true })).toHaveCount(0);
      // Related articles can be below the fold and use the browser's lazy image loading.
      // Visit pending images, verify them, then restore the scroll position for the capture.
      for (const image of await page.locator('img').all()) {
        if (
          await image.evaluate(
            (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
          )
        )
          continue;
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (node) => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0,
            ),
          )
          .toBe(true);
        await image.evaluate((node) => {
          for (let parent = node.parentElement; parent; parent = parent.parentElement)
            parent.scrollTop = 0;
        });
      }
      await expect
        .poll(() =>
          page
            .locator('img')
            .evaluateAll((images) =>
              images
                .filter(
                  (image) =>
                    !(image instanceof HTMLImageElement) ||
                    !image.complete ||
                    image.naturalWidth === 0,
                )
                .map((image) => image.getAttribute('src')),
            ),
        )
        .toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page
          .locator('img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
            ),
          ),
      ).toBe(true);
    }
  }
  await page.goto('/articles/missing');
  await expect(page.getByText('Bài viết không tồn tại', { exact: true })).toBeVisible();
  await page.goto('/articles/discussion?id=missing');
  await expect(page.getByText('Bài viết không tồn tại', { exact: true })).toBeVisible();
});
