import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const evidence = resolve(__dirname, '../../../docs/frontend-evidence');
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('home matches the mobile layout, has five tabs and opens the scan flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Chào Linh Chi!', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByText('Phân loại rác.')).toBeVisible();
  await page.getByText('Chào Linh Chi!', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidence, 'home-mobile.png') });
  await page.getByRole('button', { name: 'Quét rác ngay', exact: true }).click();
  await expect(page.getByText('Scan your item', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn quét', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn vật liệu thủ công', exact: true }).click();
  await page.getByText('Pin đã qua sử dụng', { exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận lựa chọn trong demo', exact: true }).click();
  await expect(page.getByText(/POLICY_NOT_ENABLED/)).toBeVisible();
});

test('handbook search, point filters and adding/removing journey stops work', async ({ page }) => {
  await page.goto('/handbook');
  await page.getByRole('button', { name: 'Xem tất cả', exact: true }).click();
  await expect(page).toHaveURL(/\/handbook\/list/);
  await page.getByRole('textbox', { name: 'Tìm kiếm trong sổ tay rác' }).fill('không tồn tại');
  await expect(page.getByText('Không tìm thấy vật liệu phù hợp.', { exact: true })).toBeVisible();
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Tùy chọn bản đồ', exact: true }).click();
  await page.getByRole('button', { name: 'Bộ lọc điểm thu gom', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Nhựa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Giấy, bìa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Pin đã dùng', exact: true }).click();
  await page.getByRole('button', { name: 'Áp dụng • 2 điểm phù hợp', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xem điểm thu gom Công viên cộng đồng A' }),
  ).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tìm điểm thu gom' }).fill('pin an toan');
  await page.getByRole('button', { name: 'Xem điểm thu gom Hộp pin an toàn', exact: true }).click();
  await page.getByRole('button', { name: 'Chia sẻ điểm thu gom', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm vào hành trình', exact: true }).click();
  await page.getByRole('button', { name: 'Xem hành trình', exact: true }).click();
  await expect(
    page.getByText('Hộp pin an toàn', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xóa Hộp pin an toàn', exact: true }).click();
  await expect(
    page.getByText('Hộp pin an toàn', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Công viên cộng đồng A', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});

test('saving and composing stay local, auth validates and rewards stay disabled', async ({
  page,
}) => {
  await page.goto('/events');
  await page.getByRole('button', { name: 'Lưu Một sáng sạch hơn cho biển', exact: true }).click();
  await page.getByRole('button', { name: 'Đã lưu', exact: true }).click();
  await expect(
    page.getByText('Một sáng sạch hơn cho biển', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByText('Nhập email hợp lệ.', { exact: true })).toBeVisible();
  await page.goto('/rewards/tote');
  await page.getByRole('button', { name: 'Xem trước đổi quà' }).click();
  await expect(page.getByRole('button', { name: 'Đổi quà chưa được kích hoạt' })).toBeDisabled();
  await page.goto('/compose');
  await page
    .getByRole('textbox', { name: 'Nội dung bài viết' })
    .fill('Bước xanh thử nghiệm của tôi');
  await page.getByRole('button', { name: 'Đăng bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Về cộng đồng', exact: true }).click();
  await expect(page.getByText('Bước xanh thử nghiệm của tôi', { exact: true })).toBeVisible();
});

test('theme toggles and the query error/retry state is accessible', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('switch', { name: 'Giao diện tối', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Giao diện tối', exact: true })).toBeChecked();
  await page.screenshot({ path: resolve(evidence, 'settings-dark.png') });
  await page.goto('/demo-tools');
  await page.getByRole('button', { name: 'Lỗi', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await page.getByRole('button', { name: 'Tin tức', exact: true }).click();
  await expect(page.getByText(/Không tải được dữ liệu/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
});

test('desktop preview and direct detail links render without overflow', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByText('Chào Linh Chi!', { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(evidence, 'home-desktop.png') });
  const paths = [
    ['/handbook/battery', 'Pin'],
    ['/events/beach', 'Một sáng sạch hơn cho biển'],
    ['/articles/small-steps', 'Bài viết'],
    ['/points/green-hub', 'Công viên cộng đồng A'],
    ['/onboarding?step=1', /Một khởi đầu nhỏ/],
    ['/profile', 'Cá nhân'],
    ['/statistics', 'Thống kê'],
    ['/game', 'Trò chơi'],
    ['/assistant', 'RecycleBot'],
    ['/messages', 'Healing'],
    ['/legal', 'Điều khoản & quyền riêng tư'],
    ['/register', /Bắt đầu cùng/],
    ['/forgot-password', 'Quên mật khẩu?'],
    ['/calendar', 'Lịch hoạt động'],
    ['/point-proposal', 'Đề xuất điểm thu gom mới'],
    ['/point-report', 'Báo cáo vấn đề'],
    ['/edit-profile', 'Chỉnh sửa'],
    ['/notifications', 'Thông báo'],
    ['/history', 'Lịch sử'],
    ['/does-not-exist', 'Không tìm thấy trang'],
  ] as const;
  for (const [path, heading] of paths) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: heading, exact: typeof heading === 'string' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  }
});

test('seeded history, statistics, notifications and conversations are ready to demonstrate', async ({
  page,
}) => {
  await page.goto('/history');
  await expect(page.getByText('29/10/2025', { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(evidence, 'mock-history.png') });
  await page.getByRole('tab', { name: 'Tuần này', exact: true }).click();
  await expect(page.getByText('13/10/2025', { exact: true })).toHaveCount(0);
  await page.goto('/statistics');
  await expect(page.getByText('2,500 Kg', { exact: true })).toBeVisible();
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Lọc thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Chưa đọc', exact: true }).click();
  await expect(page.getByText('3 thông báo chưa đọc', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc', exact: true }).click();
  await expect(
    page.getByText('Bạn đã xem hết thông báo', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.goto('/messages');
  await page.getByRole('button', { name: 'Hội thoại Nguyễn Thị Linh Chi', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nội dung tin nhắn' })
    .fill('Đây là tin nhắn thử mock data');
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(
    page.getByText('Đây là tin nhắn thử mock data', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hội thoại Nguyễn Thị Linh Chi', exact: true }).click();
  await expect(
    page.getByText('Đây là tin nhắn thử mock data', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({ path: resolve(evidence, 'mock-conversation.png') });
  await page.goto('/community');
  await page.getByRole('button', { name: 'Xem thảo luận', exact: true }).first().click();
  await expect(
    page.getByText('Nhìn thành quả mà có thêm động lực! 🌱', {
      exact: true,
    }),
  ).toBeVisible();
});
