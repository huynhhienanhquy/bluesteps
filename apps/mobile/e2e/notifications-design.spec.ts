import { test, expect } from '@playwright/test';

test.beforeEach(({ page }) =>
  page.on('pageerror', (error) => {
    throw error;
  }),
);
test('unread filtering, detail links and marking all read stay consistent', async ({ page }) => {
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Lọc thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Chưa đọc', exact: true }).click();
  await expect(page.getByText('3 thông báo chưa đọc', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Phân loại thành công', exact: true }).click();
  await expect(page.getByText('+ 20 điểm xanh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dùng điểm để đổi quà', exact: true }).click();
  await expect(page).toHaveURL(/\/rewards\/catalog$/);
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(
    page.getByText('2 thông báo chưa đọc', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phân loại thành công', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('tab', { name: 'Hoạt động', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hãy chụp ảnh rác', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
  await expect(
    page.getByText('Bạn đã xem hết thông báo', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Khám phá hoạt động', exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
});
test('notification preferences persist while navigating and community follow controls toggle', async ({
  page,
}) => {
  await page.goto('/notifications?view=settings');
  await expect(page.getByRole('switch', { name: 'Hoạt động', exact: true })).toBeChecked();
  await page.getByRole('switch', { name: 'Hoạt động', exact: true }).click();
  await page.getByRole('switch', { name: 'Cộng đồng', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Hoạt động', exact: true })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Cộng đồng', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Xem tất cả thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Tùy chọn thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt thông báo', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Hoạt động', exact: true })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Cộng đồng', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Xem tất cả thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Tùy chọn thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Thông báo cộng đồng', exact: true }).click();
  await page.getByRole('button', { name: 'Theo dõi bng_836', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi bng_836', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ theo dõi bng_836', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Theo dõi bng_836', exact: true })).toBeVisible();
});
test('deleting a notification remains deleted when the all filter is selected again', async ({
  page,
}) => {
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Tùy chọn thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa một thông báo ưu đãi', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa thông báo ưu đãi', exact: true }).click();
  await expect(page.getByTestId('design-frame-386:8311').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lọc thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await expect(page.getByTestId('design-frame-386:8311').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voucher tặng 10%', exact: true })).toHaveCount(0);
});
