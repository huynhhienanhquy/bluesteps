import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('proposal requires a local photo, saves a draft and restores it after leaving the form', async ({
  page,
}) => {
  await page.goto('/collection-explore');
  await page.getByRole('button', { name: 'Đề xuất địa điểm', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi đề xuất để xét duyệt', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Thêm ít nhất một ảnh địa điểm');
  await page
    .getByRole('textbox', { name: 'Tên điểm thu gom *', exact: true })
    .fill('Điểm thu gom thử nghiệm');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Ảnh địa điểm *', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(resolve(__dirname, '../assets/figma/534-48505/imgNhMinhHa.png'));
  await expect(page.getByRole('button', { name: 'Xóa ảnh 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chỉnh ghim', exact: true }).click();
  await page
    .getByRole('button', { name: 'Đặt ghim trên bản đồ mẫu', exact: true })
    .click({ position: { x: 80, y: 100 } });
  await page.getByRole('button', { name: 'Lưu vị trí ghim', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đã lưu bản nháp', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Đề xuất địa điểm', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Tên điểm thu gom *', exact: true })).toHaveValue(
    'Điểm thu gom thử nghiệm',
  );
  await expect(page.getByRole('button', { name: 'Xóa ảnh 1', exact: true })).toBeVisible();
  await expect(page.getByText('Đã chỉnh ghim trong bản nháp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi đề xuất để xét duyệt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xem trước đề xuất', exact: true })).toBeVisible();
  await expect(page.getByText(/Chưa gửi tới hệ thống/)).toBeVisible();
});

test('report keeps the selected point, supports multiple issues and validates optional detail', async ({
  page,
}) => {
  await page.goto('/points/paper-house');
  await page.getByRole('button', { name: 'Báo cáo vấn đề', exact: true }).click();
  await expect(
    page.getByText('Trạm xanh Hòa Hải', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: 'Thùng rác đã đầy', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Chọn ít nhất một vấn đề');
  await page.getByRole('checkbox', { name: 'Vị trí trên bản đồ chưa đúng', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Điểm đóng cửa hoặc ngừng hoạt động', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Mô tả thêm', exact: true }).fill('quá ngắn');
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ít nhất 10 ký tự hoặc để trống');
  await page.getByRole('textbox', { name: 'Mô tả thêm', exact: true }).fill('');
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Xem trước báo cáo', exact: true })).toBeVisible();
  await expect(page.getByText(/Chưa gửi tới hệ thống/)).toBeVisible();
});
