import { expect, test } from '@playwright/test';

test('composer preserves its draft, audience, place and feeling through every picker', async ({
  page,
}) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'Hôm nay bạn nghĩ gì?', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng bài viết', exact: true })).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Nội dung bài viết', exact: true })
    .fill('Cùng nhau làm sạch bãi biển 🌱');
  await page.getByRole('button', { name: 'Quyền xem: Công khai', exact: true }).click();
  await page.getByRole('radio', { name: 'Chỉ mình tôi', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Quyền xem: Chỉ mình tôi', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm địa điểm', exact: true }).fill('Mỹ Khê');
  await page.getByRole('button', { name: 'Chọn Bãi biển Mỹ Khê', exact: true }).click();
  await page.getByRole('button', { name: 'Cảm xúc', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm cảm xúc', exact: true }).fill('Hạnh phúc');
  await page.getByRole('button', { name: 'Chọn Hạnh phúc 1', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    'Cùng nhau làm sạch bãi biển 🌱',
  );
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Hôm nay bạn nghĩ gì?', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    'Cùng nhau làm sạch bãi biển 🌱',
  );
  await expect(
    page.getByRole('button', { name: 'Quyền xem: Chỉ mình tôi', exact: true }),
  ).toBeVisible();
});

test('two selected gallery photos are previewed and published once to the local feed', async ({
  page,
}) => {
  await page.goto('/compose');
  await page
    .getByRole('textbox', { name: 'Nội dung bài viết', exact: true })
    .fill('Bài có hai ảnh được chọn từ thư viện');
  await page.getByRole('button', { name: 'Ảnh/Video', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn nhiều file', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn ảnh 1', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn ảnh 2', exact: true }).click();
  await page.getByRole('button', { name: 'Dùng 2 ảnh', exact: true }).click();
  await page.getByRole('button', { name: 'Xem trước bài viết', exact: true }).click();
  await expect(
    page.getByText('Bài có hai ảnh được chọn từ thư viện', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đăng bài viết', exact: true }).click();
  await page.getByRole('button', { name: 'Về cộng đồng', exact: true }).click();
  await expect(page.getByText('Bài có hai ảnh được chọn từ thư viện', { exact: true })).toHaveCount(
    1,
  );
  await expect(
    page.getByText('Bài có hai ảnh được chọn từ thư viện', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hôm nay bạn nghĩ gì?', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByRole('button', { name: 'Đăng bài viết', exact: true })).toBeDisabled();
});

test('camera fixture can be captured, removed and replaced by a single gallery photo', async ({
  page,
}) => {
  await page.goto('/compose');
  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  await page.getByRole('button', { name: 'Bật/tắt đèn flash', exact: true }).click();
  await page.getByRole('button', { name: 'Chụp ảnh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng bài viết', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Bỏ ảnh 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đăng bài viết', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Ảnh/Video', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn ảnh 3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ ảnh 1', exact: true })).toBeVisible();
});

test('web prototype keyboard edits the native text field without losing its text', async ({
  page,
}) => {
  await page.goto('/compose');
  await page.getByRole('button', { name: 'Mở bàn phím soạn bài', exact: true }).click();
  await page.getByRole('button', { name: 'Phím q', exact: true }).click();
  await page.getByRole('button', { name: 'Phím cách', exact: true }).click();
  await page.getByRole('button', { name: 'Phím w', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    'q w',
  );
  await page.getByRole('button', { name: 'Xóa ký tự', exact: true }).click();
  await page.getByRole('button', { name: 'Ẩn bàn phím', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung bài viết', exact: true })).toHaveValue(
    'q ',
  );
});
