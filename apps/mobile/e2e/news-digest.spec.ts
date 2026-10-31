import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('green calendar changes years, filters categories and restores the monthly list without changing event dates', async ({
  page,
}) => {
  await page.goto('/articles/calendar');
  await expect(page.getByText('7 hoạt động trong tháng', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chọn ngày và lọc sự kiện', exact: true }).first().click();
  await page.getByRole('radio', { name: 'Workshop', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Xem sự kiện / })).toHaveCount(4);
  await page.getByRole('button', { name: 'Chọn ngày và lọc sự kiện', exact: true }).first().click();
  await page.getByRole('button', { name: 'Ngày 7 tháng 11, có sự kiện', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Xem sự kiện / })).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Xem sự kiện Đổi giấy cũ, gieo mầm xanh', exact: true })
    .click();
  await expect(page).toHaveURL(/\/events\/workshop$/);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
  await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
  await expect(page.getByText('Tháng 1, 2027', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa có sự kiện phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
  await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn ngày và lọc sự kiện', exact: true }).first().click();
  await page.getByRole('radio', { name: 'Tất cả', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Xem sự kiện / })).toHaveCount(7);
  await page.getByRole('button', { name: 'Xem tin sự kiện liên quan', exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === '/articles' && url.searchParams.get('topic') === 'Cộng đồng',
  );
});

test('brief dates validate actual calendar dates, preserve read marks while open and recover empty filters', async ({
  page,
}) => {
  await page.goto('/articles/briefs');
  await page.getByRole('button', { name: 'Chọn ngày bản tin', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Ngày bản tin (YYYY-MM-DD)', exact: true })
    .fill('2026-02-29');
  await page.getByRole('button', { name: 'Áp dụng ngày bản tin', exact: true }).click();
  await expect(page.getByText('Nhập ngày hợp lệ theo YYYY-MM-DD.', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Ngày bản tin (YYYY-MM-DD)', exact: true })
    .fill('2028-02-29');
  await page.getByRole('button', { name: 'Áp dụng ngày bản tin', exact: true }).click();
  await expect(page.getByText('29 tháng 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Không có tin phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem tất cả tin', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Đọc toàn bài / })).toHaveCount(13);
  await page
    .getByRole('button', {
      name: 'Đánh dấu đã đọc Gom pin cũ thành một thói quen riêng',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Chỉ tin chưa đọc trong màn này', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc toàn bài Gom pin cũ thành một thói quen riêng',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Hiện cả tin đã đọc', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đánh dấu chưa đọc Gom pin cũ thành một thói quen riêng',
      exact: true,
    }),
  ).toBeVisible();
});

test('live Figma calendar and brief examples open explicit local details or related topics without creating registrations', async ({
  page,
}) => {
  await page.goto('/articles/calendar?preview=1');
  await expect(page.getByText('3 hoạt động sắp tới', { exact: true })).toBeVisible();
  await expect(page.getByText('Sắp mở đăng ký', { exact: true })).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Xem sự kiện Ngày hội đổi rác lấy cây', exact: true })
    .click();
  await expect(page.getByText(/Chưa xác minh sự kiện/)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng tùy chọn lịch xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Mở menu tin tức', exact: true }).click();
  await page.getByRole('button', { name: 'Tin nhanh', exact: true }).click();
  await page.goto('/articles/briefs?preview=1');
  await expect(page.getByText('03 tin mới', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Đọc toàn bài Rác nhựa đang đi đâu?', exact: true })
    .click();
  await expect(page.getByText(/chưa có toàn văn\/nguồn tin/)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng tùy chọn bản tin', exact: true }).click();
  await page.getByRole('button', { name: 'Đọc toàn bài Mẹo xanh trong ngày', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/topics$/);
});
