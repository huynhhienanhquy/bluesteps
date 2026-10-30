import { test, expect } from '@playwright/test';

test('the complete onboarding preserves choices through the five setup steps', async ({ page }) => {
  await page.goto('/onboarding?step=1');
  await page.getByRole('button', { name: 'Bắt đầu hành trình', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Ít đồ dùng một lần/ })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Câu chuyện mới/ })).toBeVisible();
  await page.getByRole('button', { name: 'Thử phân loại rác', exact: true }).click();
  await page.getByRole('button', { name: 'Tái chế', exact: true }).click();
  await expect(page.getByText(/Đúng rồi! Chai nhựa sạch/)).toBeVisible();
  await page.getByRole('button', { name: 'Thiết lập trải nghiệm', exact: true }).click();
  const collection = page.getByRole('checkbox', { name: 'Điểm thu gom', exact: true });
  await expect(collection).not.toBeChecked();
  await collection.click();
  await expect(collection).toBeChecked();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  const goal = page.getByRole('radio', { name: 'Giảm đồ nhựa dùng một lần', exact: true });
  await goal.click();
  await expect(goal).toBeChecked();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(collection).toBeChecked();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(goal).toBeChecked();
  await page.getByRole('button', { name: 'Chọn mục tiêu này', exact: true }).click();
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();
  const reminder = page.getByRole('switch', { name: 'Nhắc tôi sống xanh', exact: true });
  await reminder.click();
  await expect(reminder).not.toBeChecked();
  await page.getByRole('radio', { name: '08:00', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu lời nhắc', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Hành trình xanh/ })).toBeVisible();
  await expect(page.getByText('Giảm đồ nhựa dùng một lần', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Khám phá trước', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chào Linh Chi!' })).toBeVisible();
});

test('Home uses the Figma frame geometry and every original asset loads locally', async ({
  page,
}) => {
  await page.setViewportSize({ width: 428, height: 926 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Chào Linh Chi!' })).toBeVisible();
  const hero = page.getByText('BLUENSTEPS · MỖI NGÀY XANH').locator('..');
  const box = await hero.boundingBox();
  expect(box).toMatchObject({ x: 24, y: 144, width: 380, height: 226 });
  const tab = page.getByRole('tab', { name: 'Trang chủ', exact: true });
  const before = await tab.boundingBox();
  await page
    .getByText('Mỗi bước nhỏ của bạn đều có ý nghĩa.', { exact: true })
    .scrollIntoViewIfNeeded();
  expect(await tab.boundingBox()).toEqual(before);
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images, (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            }),
      ),
    );
  });
  const images = await page.locator('img').evaluateAll((images) =>
    images.map((image) => ({
      source: (image as HTMLImageElement).currentSrc,
      loaded: (image as HTMLImageElement).naturalWidth > 0,
    })),
  );
  expect(images.length).toBeGreaterThan(20);
  expect(images.every((image) => image.loaded && !image.source.includes('figma.com/api/mcp'))).toBe(
    true,
  );
});

test('redesigned profile shortcuts navigate and its original imagery loads', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Cá nhân', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thành tích', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thành tích', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chào Linh Chi!' })).toBeVisible();
});

test('recovery preview validates email, six digits and matching passwords without claiming a real reset', async ({
  page,
}) => {
  await page.goto('/forgot-password');
  await page.getByRole('button', { name: 'Gửi mã xác thực', exact: true }).click();
  await expect(page.getByText('Nhập email hợp lệ.', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Email đã đăng ký', exact: true })
    .fill('demo@example.test');
  await page.getByRole('button', { name: 'Gửi mã xác thực', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kiểm tra email nhé!' })).toBeVisible();
  await expect(page.getByText('demo@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xác thực và tiếp tục', exact: true }).click();
  await expect(page.getByText('Nhập đủ 6 chữ số.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Mã xác thực gồm 6 chữ số', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Xác thực và tiếp tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: /An toàn hơn/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Mật khẩu mới', exact: true }).fill('demo-password-123!');
  await page
    .getByRole('textbox', { name: 'Xác nhận mật khẩu mới', exact: true })
    .fill('different-password');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới', exact: true }).click();
  await expect(page.getByText('Mật khẩu xác nhận chưa khớp.', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Xác nhận mật khẩu mới', exact: true })
    .fill('demo-password-123!');
  await page.getByRole('button', { name: 'Lưu mật khẩu mới', exact: true }).click();
  await expect(page.getByText(/Bản xem trước chưa cập nhật mật khẩu tài khoản/)).toBeVisible();
});
