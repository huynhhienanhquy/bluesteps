import { test, expect } from '@playwright/test';

test('collection move, rename and delete preserve saved activities and allow cancellation', async ({
  page,
}) => {
  await page.goto('/event-collections');
  await expect(page.getByRole('button', { name: 'Cuối tuần · 1', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Chuyển hoạt động đã chọn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cuối tuần · 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gần nhà · 1', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Tùy chọn bộ sưu tập Gần nhà', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi tên bộ sưu tập', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tên bộ sưu tập', exact: true }).fill('Gần trường');
  await page.getByRole('button', { name: 'Lưu tên bộ sưu tập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gần trường · 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn bộ sưu tập Gần trường', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa bộ sưu tập', exact: true }).click();
  await page.getByRole('button', { name: 'Giữ bộ sưu tập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gần trường · 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn bộ sưu tập Gần trường', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa bộ sưu tập', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa bộ sưu tập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gần trường · 1', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Về hoạt động đã lưu', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xóa Đổi giấy cũ, gieo mầm xanh', exact: true }),
  ).toBeVisible();
});

test('collections pass only the selected saved activities into an unsaved reminder draft', async ({
  page,
}) => {
  await page.goto('/event-collections');
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Nhắc lịch cho hoạt động đã chọn', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }),
  ).toBeChecked();
  await page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }).check();
  await page.getByRole('button', { name: 'Về hoạt động yêu thích', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }),
  ).not.toBeChecked();
});

test('reminder channels, sound, custom timing and quiet hours save only when valid', async ({
  page,
}) => {
  await page.goto('/event-reminders');
  await page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('switch', { name: 'Thông báo trên điện thoại', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Lưu cấu hình nhắc lịch', exact: true }).click();
  await expect(
    page.getByText('Chọn ít nhất một kênh nhận lời nhắc.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('switch', { name: 'Email nhắc lịch', exact: true }).check();
  await page.getByRole('switch', { name: 'Âm thanh và rung', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Tùy chỉnh', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tùy chỉnh số giờ (1–168)', exact: true }).fill('169');
  await page.getByRole('button', { name: 'Thêm thời điểm tùy chỉnh', exact: true }).click();
  await expect(
    page.getByText('Số giờ tùy chỉnh phải từ 1 đến 168.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Tùy chỉnh số giờ (1–168)', exact: true }).fill('6');
  await page.getByRole('button', { name: 'Thêm thời điểm tùy chỉnh', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ nhắc trước 6 giờ', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Chỉnh giờ yên lặng', exact: true }).click();
  await page.getByRole('textbox', { name: 'Bắt đầu (HH:mm)', exact: true }).fill('25:00');
  await page.getByRole('button', { name: 'Áp dụng giờ yên lặng', exact: true }).click();
  await expect(page.getByText(/Nhập giờ yên lặng theo HH:mm/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Bắt đầu (HH:mm)', exact: true }).fill('21:00');
  await page.getByRole('button', { name: 'Áp dụng giờ yên lặng', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu cấu hình nhắc lịch', exact: true }).click();
  await expect(
    page.getByText('Đã lưu cấu hình trong phiên demo. Chưa lên lịch hoặc gửi thông báo/email.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về hoạt động yêu thích', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Email nhắc lịch', exact: true })).toBeChecked();
  await expect(
    page.getByRole('switch', { name: 'Thông báo trên điện thoại', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('switch', { name: 'Âm thanh và rung', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Bỏ nhắc trước 6 giờ', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('21:00–07:00 • Nhắc lại sau 07:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chỉnh giờ yên lặng', exact: true }).click();
  await page.getByRole('textbox', { name: 'Bắt đầu (HH:mm)', exact: true }).fill('20:00');
  await page.getByRole('button', { name: 'Đóng tùy chọn', exact: true }).click();
  await expect(page.getByText('21:00–07:00 • Nhắc lại sau 07:00', { exact: true })).toBeVisible();
});

test('Figma previews are interactive without changing the real saved list or reminder settings', async ({
  page,
}) => {
  await page.goto('/event-collections?preview=1');
  await expect(page.getByRole('button', { name: 'Cuối tuần · 4', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển hoạt động đã chọn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cuối tuần · 2', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gần nhà · 5', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Giờ học xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Nhắc lịch cho hoạt động đã chọn', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Giờ học xanh', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Lưu cấu hình nhắc lịch', exact: true }).click();
  await expect(
    page.getByText('Đã cập nhật bản xem trước. Cấu hình trong phiên không thay đổi.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về hoạt động yêu thích', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xóa Giờ học xanh', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }),
  ).not.toBeChecked();
});
