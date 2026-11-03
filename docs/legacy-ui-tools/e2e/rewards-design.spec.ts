import { test, expect } from '@playwright/test';

test('daily reward, reminder and redemption remain consistent across reward screens', async ({
  page,
}) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.goto('/rewards');
  await page.getByRole('button', { name: 'Mở phần thưởng', exact: true }).click();
  await expect(page.getByText('180 điểm', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nhận ngay 2 điểm', exact: true }).click();
  await page.getByRole('button', { name: 'Đóng nhận thưởng', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Đã nhận thưởng hôm nay', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText('182 điểm', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nhắc tôi nhận thưởng', exact: true }).click();
  await expect(page.getByText(/Đã đặt nhắc nhở/)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông báo nhắc thưởng', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy lời nhắc thưởng', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Nhắc tôi nhận thưởng', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đổi Chậu cây tái chế, 80 điểm', exact: true }).click();
  await expect(page.getByText(/Bạn đang có 182 điểm/)).toBeVisible();
  await page.getByRole('button', { name: 'Hủy đổi quà', exact: true }).click();
  await expect(page.getByText('182 điểm', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đổi Chậu cây tái chế, 80 điểm', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi ngay trong phiên UI', exact: true }).click();
  await page.getByRole('button', { name: 'Nhận quà trong phiên UI', exact: true }).click();
  await expect(page.getByText('102 điểm', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Khác', exact: true }).click();
  await page
    .getByRole('button', { name: 'Đổi Bình giữ nhiệt mini, 200 điểm', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Đổi ngay trong phiên UI', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('Bạn chưa đủ điểm cho phần quà này.');
  await page.getByRole('button', { name: 'Hủy đổi quà', exact: true }).click();
  await page.getByRole('button', { name: 'Lịch sử điểm và quà', exact: true }).click();
  await expect(page.getByText('102 điểm', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Tuần này', exact: true }).click();
  await expect(page.getByText('13/10/2025', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Tháng này', exact: true }).click();
  await expect(page.getByText('13/10/2025', { exact: true })).toBeVisible();
});

test('categories, guide and bottom navigation open their intended destinations', async ({
  page,
}) => {
  await page.goto('/rewards/catalog');
  await page.getByRole('tab', { name: 'Voucher', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Đổi Voucher Siêu thị 30k, 150 điểm', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Giải trí', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Đổi Vé xem phim, 80 điểm', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Đồ tái chế', exact: true }).click();
  await page.getByRole('button', { name: 'Tùy chọn phần thưởng', exact: true }).click();
  await page.getByRole('button', { name: 'Cách quy đổi điểm', exact: true }).click();
  await expect(page).toHaveURL(/\/rewards\/guide$/);
  await page.getByRole('button', { name: 'Đổi thưởng', exact: true }).click();
  await expect(page).toHaveURL(/\/rewards\/catalog$/);
  await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
  await expect(page.getByText('Chào Linh Chi!', { exact: true })).toBeVisible();
});
