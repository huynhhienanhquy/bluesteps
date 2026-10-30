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

test('Home opens the matching activity and registration, ticket, check-in and feedback stay local', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Giờ học xanh', exact: true }).click();
  await expect(page).toHaveURL(/\/events\/green-class$/);
  await expect(page.getByRole('heading', { name: 'Giờ học xanh', exact: true })).toBeVisible();
  await expect(page.getByText('Trường Mầm non Tuổi Xanh, TP HCM', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu hoạt động', exact: true }).click();
  await page.getByRole('button', { name: 'Xem biểu mẫu đăng ký', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận đăng ký mẫu · Miễn phí', exact: true }).click();
  await expect(page.getByText('Nhập tên ít nhất 2 ký tự.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Họ và tên *', exact: true }).fill('Linh Chi');
  await page.getByRole('textbox', { name: 'Số điện thoại *', exact: true }).fill('0901234567');
  await page
    .getByRole('textbox', { name: 'Email nhận vé *', exact: true })
    .fill('chi@example.test');
  await page.getByRole('button', { name: 'Tăng số người', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'Tôi đã đọc yêu cầu và đồng ý tuân thủ hướng dẫn an toàn',
      exact: true,
    })
    .check();
  await page
    .getByRole('checkbox', {
      name: 'Cho phép dùng thông tin liên hệ cho hoạt động này',
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Xác nhận đăng ký mẫu · Miễn phí', exact: true }).click();
  await expect(page).toHaveURL(/event-ticket\?id=green-class$/);
  await expect(page.getByText('Linh Chi', { exact: true })).toBeVisible();
  await expect(page.getByText('2 người · Hướng dẫn phân loại rác', { exact: true })).toBeVisible();
  await expect(
    page.getByText('QR minh họa · Không dùng để quét thực tế', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mô phỏng check-in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã check-in mẫu', exact: true })).toBeDisabled();
  await page.screenshot({ path: resolve(evidence, 'event-ticket-checked-in-390.png') });
  await page.getByRole('button', { name: 'Xem tổng kết mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Đánh giá 5 sao', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Chia sẻ thêm', exact: true })
    .fill('Buổi thực hành rất vui.');
  await page.getByRole('button', { name: 'Lưu phản hồi trong demo', exact: true }).click();
  await expect(
    page.getByText('Đã lưu phản hồi trong phiên demo, chưa gửi ban tổ chức.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Tạo vé mẫu để thử lưu phản hồi trong phiên.', { exact: true }),
  ).toBeVisible();
});

test('saved events can be organized, reminders persist across navigation and deletion asks for confirmation', async ({
  page,
}) => {
  await page.goto('/saved');
  await page.getByRole('button', { name: 'Bộ sưu tập', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tên bộ sưu tập mới', exact: true })
    .fill('Kế hoạch tháng 11');
  await page.getByRole('button', { name: 'Tạo bộ sưu tập', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Thêm vào bộ sưu tập đang chọn', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kế hoạch tháng 11 · 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về hoạt động đã lưu', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Lưu cấu hình nhắc lịch', exact: true }).click();
  await expect(
    page.getByText('Đã lưu cấu hình trong phiên demo. Chưa lên lịch hoặc gửi thông báo/email.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Về hoạt động đã lưu', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Về hoạt động đã lưu', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa Đổi giấy cũ, gieo mầm xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy xóa', exact: true }).click();
  await expect(
    page.getByText('Đổi giấy cũ, gieo mầm xanh', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xóa Đổi giấy cũ, gieo mầm xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByText('Chưa có hoạt động yêu thích', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bộ sưu tập', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kế hoạch tháng 11 · 0', exact: true }),
  ).toBeVisible();
});

test('calendar selects full dates, switches months and shows the empty state', async ({ page }) => {
  await page.goto('/calendar');
  await expect(
    page.getByRole('button', { name: 'Xem hoạt động Giờ học xanh', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ngày 24 tháng 10', exact: true }).click();
  await expect(
    page.getByText('Không có hoạt động trong thời gian này', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
  await page.getByRole('button', { name: 'Ngày 1 tháng 11, có hoạt động', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xem hoạt động Một sáng sạch hơn cho biển', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tuần', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ngày 7 tháng 11, có hoạt động', exact: true }),
  ).toHaveCount(0);
});

test('event screens render at 390 and 428 px with local assets and valid empty deep links', async ({
  page,
}) => {
  for (const width of [390, 428]) {
    await page.setViewportSize({ width, height: 926 });
    for (const [path, name] of [
      ['/events', 'events'],
      ['/calendar', 'event-calendar'],
      ['/registration?id=green-class', 'event-registration'],
      ['/saved', 'saved-events'],
      ['/event-collections', 'event-collections'],
      ['/event-reminders', 'event-reminders'],
      ['/event-summary?id=green-class', 'event-summary'],
    ]) {
      await page.goto(path!);
      await expect(page.getByRole('button', { name: 'Quay lại', exact: true })).toBeVisible();
      await page.screenshot({ path: resolve(evidence, `${name}-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.goto('/event-ticket?id=green-class');
  await expect(page.getByText(/Bạn chưa tạo vé mẫu/)).toBeVisible();
  await page.goto('/registration?id=missing');
  await expect(page.getByText('Hoạt động không tồn tại', { exact: true })).toBeVisible();
});
