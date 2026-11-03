import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('owned parent deletion can be cancelled and preserves a long reply without overflowing at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/articles/discussion?id=small-steps');
  const field = page.getByRole('textbox', { name: 'Nội dung thảo luận bài viết', exact: true });
  await field.fill('Bình luận cha của tôi');
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  await page.getByRole('button', { name: 'Trả lời Bạn · Demo', exact: true }).click();
  const content = 'x'.repeat(500);
  await field.fill(content);
  await expect(field).toHaveValue(content);
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  const body = page.getByText(content, { exact: true });
  await expect(body).toBeVisible();
  const bounds = await body.boundingBox();
  expect(bounds!.height).toBeGreaterThan(60);
  expect(bounds!.width).toBeLessThanOrEqual(200);
  await page
    .getByRole('button', { name: 'Xóa bình luận: Bình luận cha của tôi', exact: true })
    .click();
  await page.getByRole('button', { name: 'Giữ bình luận', exact: true }).click();
  await expect(page.getByText('Bình luận cha của tôi', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Xóa bình luận: Bình luận cha của tôi', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xác nhận xóa bình luận', exact: true }).click();
  await expect(page.getByText('Bình luận cha của tôi', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Trả lời Bạn · Demo: Bình luận cha/)).toHaveCount(0);
  await expect(body).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the featured story and all four topic cards open their matching feed while follow choices remain local', async ({
  page,
}) => {
  await page.goto('/articles/topics');
  await page.getByRole('button', { name: 'Theo dõi Phân loại', exact: true }).click();
  await page.getByRole('button', { name: 'Theo dõi Lối sống', exact: true }).click();
  await expect(
    page.getByText('Đang theo dõi 2 chủ đề trong phiên demo', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xem chủ đề đại dương', exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/articles' && url.searchParams.get('topic') === 'Môi trường',
  );
  await expect(page.getByText('3 kết quả phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  for (const [topic, count] of [
    ['Phân loại', 3],
    ['Lối sống', 2],
    ['Cộng đồng', 5],
    ['Môi trường', 3],
  ] as const) {
    await page.getByRole('button', { name: `Xem chủ đề ${topic}`, exact: true }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === '/articles' && url.searchParams.get('topic') === topic,
    );
    await expect(page.getByText(`${count} kết quả phù hợp`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  }
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi Phân loại', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi Lối sống', exact: true }),
  ).toBeVisible();
});

test('discussion preview sorting, likes and posting never add comments to the actual article', async ({
  page,
}) => {
  await page.goto('/articles/discussion?id=daily-waste&preview=1');
  await expect(page.getByText('3 ý kiến', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thích bình luận của Minh Trang', exact: true }).click();
  await expect(
    page.getByTestId('article-comment-101').getByText('13', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sắp xếp thảo luận', exact: true }).click();
  await page.getByRole('radio', { name: 'Mới nhất', exact: true }).click();
  await expect(page.locator('[data-testid^="article-comment-"]').first()).toContainText(
    'Linh Nguyễn',
  );
  await page.getByRole('button', { name: 'Sắp xếp thảo luận', exact: true }).click();
  await page.getByRole('radio', { name: 'Nổi bật', exact: true }).click();
  await expect(page.locator('[data-testid^="article-comment-"]').first()).toContainText(
    'Minh Trang',
  );
  await page
    .getByRole('textbox', { name: 'Nội dung thảo luận bài viết', exact: true })
    .fill('Nội dung chỉ trong preview');
  await page.getByRole('button', { name: 'Đăng thảo luận trong demo', exact: true }).click();
  await expect(
    page.getByText('Đã thêm thảo luận trong bản xem trước. Dữ liệu phiên không thay đổi.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về bài viết', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/daily-waste\?preview=1$/);
  await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
  await page
    .getByRole('button', {
      name: '11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/articles\/daily-waste$/);
  await page.getByRole('button', { name: 'Thảo luận bài viết · 0', exact: true }).click();
  await expect(page.getByText('Chưa có thảo luận cho bài viết', { exact: true })).toBeVisible();
  await expect(page.getByText('Nội dung chỉ trong preview', { exact: true })).toHaveCount(0);
});
