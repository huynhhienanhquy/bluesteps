import { test, expect } from '@playwright/test';

test('sound changes apply on save and cancel restores the previous choices', async ({ page }) => {
  await page.goto('/settings');
  const open = () => page.getByRole('button', { name: 'Âm thanh và rung', exact: true }).click();
  await open();
  const sound = page.getByRole('switch', { name: 'Âm thanh', exact: true });
  await expect(sound).toBeChecked();
  await sound.click();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await open();
  await expect(sound).toBeChecked();
  await sound.click();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await open();
  await expect(sound).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Rung', exact: true })).toBeChecked();
});

test('settings search filters Vietnamese text and opens the matching screen', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Tìm kiếm cài đặt', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Tìm kiếm cài đặt' });
  await dialog.getByRole('textbox', { name: 'Từ khóa', exact: true }).fill('mat khau');
  await expect(
    dialog.getByRole('button', { name: 'Sửa thông tin cá nhân', exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Thay đổi mật khẩu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thay đổi mật khẩu', exact: true })).toBeVisible();
});

test('PIN preview requires six digits and does not claim to activate a real lock', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Thiết lập mật mã', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByText('Nhập đủ 6 chữ số để tiếp tục.', { exact: true })).toBeVisible();
  for (const digit of ['1', '2', '3', '4', '5', '6'])
    await page.getByRole('button', { name: `Phím ${digit}`, exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(
    page.getByText('Bản xem trước chưa bật khóa ứng dụng hoặc lưu mã PIN.', { exact: true }),
  ).toBeVisible();
});

test('profile editor formats dates and validates the local preview', async ({ page }) => {
  await page.goto('/edit-profile');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('invalid');
  await page.getByRole('textbox', { name: 'Ngày sinh', exact: true }).fill('31112005');
  await expect(page.getByRole('textbox', { name: 'Ngày sinh', exact: true })).toHaveValue(
    '31/11/2005',
  );
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByText(/Kiểm tra tên, email và ngày sinh/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('demo@example.test');
  await page.getByRole('textbox', { name: 'Ngày sinh', exact: true }).fill('30102005');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    page.getByText('Đã cập nhật bản xem trước. Hồ sơ tài khoản chưa thay đổi.', { exact: true }),
  ).toBeVisible();
});
