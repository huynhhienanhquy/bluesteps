import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const evidence = resolve(__dirname, '../../../docs/ui-progress-evidence-2026-10-30');
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('Home opens the matching activity and registration, ticket, check-in and feedback stay local', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Giờ học xanh', exact: true }).click();
  await expect(page).toHaveURL(/\/events\/green-class$/);
  await expect(page.getByRole('heading', { name: 'Giờ học xanh', exact: true })).toBeVisible();
  await expect(page.getByText('Trường Mầm non Tuổi Xanh, TP HCM', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu hoạt động', exact: true }).click();
  await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).click();
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
  await page.getByRole('button', { name: 'Về lịch hoạt động', exact: true }).click();
  await page.getByRole('button', { name: 'Xem vé tham gia', exact: true }).click();
  await page.getByRole('button', { name: 'Mở vé Giờ học xanh', exact: true }).click();
  await expect(page).toHaveURL(/event-ticket\?id=green-class$/);
  await page.getByRole('button', { name: 'Mô phỏng check-in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã check-in mẫu', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('event-ticket-checked-in-390.png') });
  await page.getByRole('button', { name: 'Xem tổng kết mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Đánh giá 5 sao', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Chia sẻ thêm', exact: true })
    .fill('Buổi thực hành rất vui.');
  await page.getByRole('button', { name: 'Lưu phản hồi trong demo', exact: true }).click();
  await expect(
    page.getByText('Đã lưu phản hồi trong phiên demo, chưa gửi ban tổ chức.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xem album hoạt động', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Album hoạt động', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng album', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Album hoạt động', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText('Tạo vé mẫu để thử lưu phản hồi trong phiên.', { exact: true }),
  ).toBeVisible();
});

test('preview feedback does not create a ticket and the role picker preserves participation choices', async ({
  page,
}) => {
  await page.goto('/event-summary?id=green-class&preview=1');
  await page.getByRole('button', { name: 'Lưu phản hồi trong demo', exact: true }).click();
  await expect(
    page.getByText('Đã ghi nhận phản hồi xem trước trên màn này; chưa gửi ban tổ chức.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/event-ticket?id=green-class');
  await expect(page.getByText(/Bạn chưa tạo vé mẫu/)).toBeVisible();
  await page.goto('/registration?id=green-class&preview=1');
  await page.getByRole('combobox', { name: 'Vai trò tình nguyện', exact: true }).click();
  await page.getByRole('radio', { name: 'Hỗ trợ hậu cần', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Vai trò tình nguyện', exact: true }),
  ).toContainText('Hỗ trợ hậu cần');
  await expect(page.getByRole('button', { name: 'Giảm số người', exact: true })).toBeDisabled();
  for (let index = 0; index < 4; index++)
    await page.getByRole('button', { name: 'Tăng số người', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tăng số người', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Xác nhận đăng ký mẫu · Miễn phí', exact: true }).click();
  await expect(page).toHaveURL(/event-ticket\?id=green-class$/);
  await expect(page.getByText('5 người · Hỗ trợ hậu cần', { exact: true })).toBeVisible();
});

test('saved events can be organized, reminders persist across navigation and deletion asks for confirmation', async ({
  page,
}) => {
  await page.goto('/saved');
  await page.getByRole('button', { name: 'Bộ sưu tập', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo bộ sưu tập', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tên bộ sưu tập mới', exact: true })
    .fill('Kế hoạch tháng 11');
  await page.getByRole('button', { name: 'Xác nhận tạo bộ sưu tập', exact: true }).click();
  await page
    .getByRole('button', { name: 'Chọn hoạt động từ danh sách đã lưu', exact: true })
    .click();
  await page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }).check();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
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
  await page.getByRole('button', { name: 'Về hoạt động yêu thích', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắc lịch', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Bật nhắc lịch hoạt động', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Đổi giấy cũ, gieo mầm xanh', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Về hoạt động yêu thích', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa Đổi giấy cũ, gieo mầm xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy xóa', exact: true }).click();
  await expect(
    page.getByText('Đổi giấy cũ, gieo mầm xanh', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xóa Đổi giấy cũ, gieo mầm xanh', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByText('Chưa có hoạt động yêu thích', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông báo yêu thích', exact: true }).click();
  await page.getByRole('button', { name: 'Bộ sưu tập', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kế hoạch tháng 11 · 0', exact: true }),
  ).toBeVisible();
});

test('ticket preview downloads a PNG and opens only local contact information without creating a registration', async ({
  page,
}, testInfo) => {
  await page.goto('/event-ticket?id=green-class&preview=1');
  await expect(page.getByTestId('sample-event-ticket')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Lưu vé vào thiết bị', exact: true }).click();
  const download = await downloading;
  await download.saveAs(testInfo.outputPath('event-ticket-downloaded.png'));
  expect(download.suggestedFilename()).toBe('bluesteps-demo-green-class.png');
  const file = await download.path();
  expect(file).toBeTruthy();
  const bytes = readFileSync(file!);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(300);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(500);
  const { PNG } = require('../../../node_modules/.pnpm/pngjs@3.4.0/node_modules/pngjs');
  const png = PNG.sync.read(bytes);
  const margin = (180 * png.width + 10) * 4;
  expect(Array.from(png.data.subarray(margin, margin + 4))).toEqual([255, 255, 255, 255]);
  await expect(
    page.getByText('Đã tải ảnh vé mẫu PNG xuống thiết bị.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Liên hệ nhóm tổ chức mẫu', exact: true }).click();
  await expect(page.getByText(/Đây là nhóm minh họa/)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông tin liên hệ', exact: true }).click();
  await page.goto('/event-ticket?id=green-class');
  await expect(page.getByText(/Bạn chưa tạo vé mẫu/)).toBeVisible();
});

test('calendar selects full dates, switches months and shows the empty state', async ({ page }) => {
  await page.goto('/calendar');
  await expect(
    page.getByRole('button', { name: 'Xem hoạt động Giờ học xanh', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Hai hoạt động đang trùng giờ', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Giờ học xanh và Trồng cây cuối tuần trùng từ 09:00 đến 10:00/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ngày 24 tháng 10', exact: true }).click();
  await expect(
    page.getByText('Không có hoạt động trong thời gian này', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Hai hoạt động đang trùng giờ', { exact: true })).toHaveCount(0);
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
}, testInfo) => {
  test.setTimeout(60_000);
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
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.goto('/event-ticket?id=green-class');
  await expect(page.getByText(/Bạn chưa tạo vé mẫu/)).toBeVisible();
  await page.goto('/registration?id=missing');
  await expect(page.getByText('Hoạt động không tồn tại', { exact: true })).toBeVisible();
  await page.goto('/events');
  await page.getByRole('button', { name: 'Trồng cây', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xem hoạt động Trồng cây cuối tuần', exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm hoạt động', exact: true }).fill('gia dinh');
  await expect(
    page.getByRole('button', { name: 'Xem hoạt động Vườn nhỏ giữa phố', exact: true }),
  ).toHaveCount(0);
  const cover = page
    .getByRole('button', { name: 'Xem hoạt động Trồng cây cuối tuần', exact: true })
    .locator('img');
  await expect(cover).toBeVisible();
  expect(
    await cover.evaluate(
      (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    ),
  ).toBe(true);
});
