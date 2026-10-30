import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('scan sample states retry, open the handbook and preserve the five original tabs', async ({
  page,
}) => {
  await page.goto('/scan');
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByRole('tab', { name: 'Quét rác', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'Tùy chọn quét', exact: true }).click();
  await expect(page.getByText(/Các trạng thái bên dưới là mẫu giao diện/)).toBeVisible();
  await page.getByRole('button', { name: 'Mẫu không nhận diện được', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Không nhận diện được rác', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sổ tay rác', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sổ tay rác', exact: true })).toBeVisible();
});

test('camera sample capture opens the result and its original detail screen', async ({ page }) => {
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Tùy chọn quét', exact: true }).click();
  await page.getByRole('button', { name: 'Camera mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Chụp ảnh vật liệu', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn vật liệu trong ảnh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả quét rác', exact: true })).toBeVisible();
});

test('sample processing, result detail and the five-point preview remain a local demonstration', async ({
  page,
}) => {
  await page.goto('/scan?state=loading&preview=1');
  await expect(page.getByRole('heading', { name: 'Loading...', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xem kết quả mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả quét rác', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tích điểm xanh', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Thông báo điểm mẫu', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CHÚC MỪNG', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông báo điểm mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Xem thùng rác gần đây', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
});

test('the scan handbook scrolls to its last material and returns to the same list', async ({
  page,
}) => {
  await page.goto('/scan?state=handbook&preview=1');
  await page.getByRole('button', { name: 'Carton', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Carton', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hộp Carton', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sổ tay rác', exact: true })).toBeVisible();
});

test('actual camera stays separate from sample photos when permission is denied', async ({
  page,
}) => {
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Scan your waste', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Camera quét rác', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chụp ảnh vật liệu', exact: true })).toBeDisabled();
  const samplePhotoVisible = await page
    .locator('img')
    .evaluateAll((images) =>
      images.some((image) => /imgRectangle207/.test((image as HTMLImageElement).src)),
    );
  expect(samplePhotoVisible).toBe(false);
  await page.getByRole('button', { name: 'Chọn vật liệu thay thế', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Vật liệu của bạn là gì?', exact: true }),
  ).toBeVisible();
});

test('a chosen local photo opens manual selection and keeps its image in the result', async ({
  page,
}) => {
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Tùy chọn quét', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
  await (await chooser).setFiles(resolve(__dirname, '../assets/figma/386-13364/imgImage32.png'));
  await expect(
    page.getByRole('heading', { name: 'Vật liệu của bạn là gì?', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Pin đã qua sử dụng/ }).click();
  await page.getByRole('button', { name: 'Xác nhận lựa chọn trong demo', exact: true }).click();
  await expect(page.getByText(/Điểm thưởng: 0 · POLICY_NOT_ENABLED/)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả', exact: true })).toBeVisible();
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.some((image) => /^(blob:|data:image)/.test((image as HTMLImageElement).src)),
      ),
  ).toBe(true);
  await expect(page.getByText('Pin đã qua sử dụng', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả quét rác', exact: true })).toBeVisible();
  await expect(page.getByText('Pin đã qua sử dụng', { exact: true })).toBeVisible();
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.some((image) => /^(blob:|data:image)/.test((image as HTMLImageElement).src)),
      ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Tích điểm xanh', exact: true }).click();
  await expect(page.getByText(/Điểm thưởng: 0 · POLICY_NOT_ENABLED/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Thông báo điểm mẫu', exact: true })).toHaveCount(
    0,
  );
});

test('direct preview links keep the back and result controls usable', async ({ page }) => {
  await page.goto('/scan?state=camera&preview=1');
  await page.getByRole('button', { name: 'Chụp ảnh vật liệu', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn vật liệu trong ảnh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Scan your item', exact: true })).toBeVisible();
});
