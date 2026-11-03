import { test, expect } from '@playwright/test';
test.beforeEach(({ page }) =>
  page.on('pageerror', (error) => {
    throw error;
  }),
);

test('likes and saves remain consistent between feed, post and saved screens', async ({ page }) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'Thích bài đăng', exact: true }).click();
  await expect(page.getByTestId('design-frame-386:7813').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở bài đăng Healing', exact: true }).click();
  await expect(page.getByTestId('design-frame-734:5760').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ thích bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Bỏ lưu bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Bài đã lưu', exact: true }).click();
  await expect(page.getByText('2 bài đăng để đọc lại', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mở bài đã lưu Healing', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Mở bài đã lưu Save', exact: true }).click();
  await page.getByRole('button', { name: 'Trang thành viên tác giả', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Theo dõi Save', exact: true })).toBeVisible();
});
test('comment editor validates empty text and displays the submitted comment', async ({ page }) => {
  await page.goto('/community?view=post');
  await page.getByRole('button', { name: 'Viết bình luận', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Nhập bình luận trước khi gửi.');
  await page
    .getByRole('textbox', { name: 'Bình luận của bạn', exact: true })
    .fill('Mình sẽ cùng phân loại rác mỗi ngày!');
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(
    page
      .getByText('Mình sẽ cùng phân loại rác mỗi ngày!', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText('◉ 6 bình luận', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Viết bình luận', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Bình luận của bạn', exact: true })).toHaveValue(
    '',
  );
});
test('explore searches members, follows the selected member and opens topic results', async ({
  page,
}) => {
  await page.goto('/community');
  await page.getByRole('textbox', { name: 'Tìm kiếm cộng đồng', exact: true }).fill('tái chế');
  await page.getByRole('textbox', { name: 'Tìm kiếm cộng đồng', exact: true }).press('Enter');
  await page.getByRole('tab', { name: 'Thành viên', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm kiếm cộng đồng', exact: true }).fill('Linh Chi');
  await expect(page.getByText('1 thành viên', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Trang thành viên Linh Chi', exact: true }).click();
  await page.getByRole('button', { name: 'Theo dõi Linh Chi', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi Linh Chi', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ theo dõi Linh Chi', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Chủ đề', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa từ khóa', exact: true }).click();
  await page.getByRole('button', { name: 'Chủ đề Phân loại rác', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Đọc Một ngày phân loại rác cùng bạn bè', exact: true }),
  ).toBeVisible();
});
test('post options copy a link and hide the selected post from the feed', async ({ page }) => {
  await page.goto('/community?view=post');
  await page.getByRole('button', { name: 'Tùy chọn bài đăng', exact: true }).click();
  await page.getByRole('button', { name: 'Sao chép liên kết', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Đã sao chép liên kết|Liên kết bài đăng:/);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Ẩn bài đăng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mở bài đăng Healing', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Mở bài đăng Save', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thông báo cộng đồng', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications\?view=community$/);
});
