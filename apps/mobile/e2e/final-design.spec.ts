import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('searching games and sorting all eight items reaches a replayable result', async ({
  page,
}) => {
  await page.goto('/game');
  await page.getByRole('button', { name: 'Tìm trò chơi', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tên trò chơi' }).fill('không tồn tại');
  await expect(page.getByText('Không tìm thấy trò chơi.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tên trò chơi' }).fill('sứ mệnh');
  await page.getByRole('button', { name: 'Sứ mệnh xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kiểm tra', exact: true })).toBeDisabled();
  for (const [item, bin] of [
    ['Chai nhựa', 'Tái chế'],
    ['Pin đã qua sử dụng', 'Vô cơ'],
    ['Giấy vệ sinh', 'Vô cơ'],
    ['Túi nhựa tím', 'Vô cơ'],
    ['Mảnh vỡ', 'Vô cơ'],
    ['Thùng giấy', 'Tái chế'],
    ['Vỏ chuối', 'Hữu cơ'],
    ['Rau củ', 'Hữu cơ'],
  ]) {
    await page.getByRole('button', { name: `Chọn ${item}`, exact: true }).click();
    await page.getByRole('button', { name: `Bỏ vào ${bin}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await expect(page.getByText('Đã xếp 8/8 vật phẩm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click();
  await expect(page.getByText('CHÚC MỪNG', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kiểm tra', exact: true }).filter({ visible: true }),
  ).toBeDisabled();
  await expect(page.getByText('Chọn vật phẩm rồi chọn thùng · 0/8', { exact: true })).toBeVisible();
});

test('room and schedule forms validate and keep the saved title in the current session', async ({
  page,
}) => {
  await page.goto('/game');
  await page.getByRole('button', { name: 'Tạo lịch chơi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lưu lịch chơi', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Tên phòng', exact: true }).fill('Buổi chơi của Chi');
  await page.getByRole('textbox', { name: 'Thời gian chơi', exact: true }).fill('Chủ nhật 09:00');
  await page.getByRole('button', { name: 'Lưu lịch chơi', exact: true }).click();
  await expect(page.getByText('Buổi chơi của Chi · Chủ nhật 09:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạo phòng', exact: true }).last()).toBeDisabled();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByTestId('design-frame-386:18241')).toBeVisible();
});

test('the original navigation opens statistics and its achievement action works', async ({
  page,
}) => {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'Mở menu tin tức', exact: true }).click();
  await page.getByRole('button', { name: 'Thống kê', exact: true }).click();
  await expect(page).toHaveURL(/\/statistics/);
  await expect(
    page.getByRole('heading', { name: 'Thống kê', exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xem thành tích', exact: true }).click();
  await expect(page).toHaveURL(/\/achievements/);
});

test('reference result states replay and navigate to rewards', async ({ page }) => {
  await page.goto('/game?frame=487:19805');
  await page.getByRole('button', { name: 'Đi đến tích điểm', exact: true }).click();
  await expect(page).toHaveURL(/\/rewards/);
  await page.goto('/game?frame=386:18428');
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click();
  await expect(page.getByTestId('design-frame-386:18308')).toBeVisible();
});
