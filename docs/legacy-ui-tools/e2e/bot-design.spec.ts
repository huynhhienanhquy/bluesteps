import { expect, test } from '@playwright/test';
test('typed question clears the draft and its reply opens the handbook', async ({ page }) => {
  await page.goto('/assistant');
  await expect(page.getByRole('button', { name: 'Gửi câu hỏi', exact: true })).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Câu hỏi cho RecycleBot', exact: true })
    .fill('Tôi muốn phân loại chai nhựa');
  await page.getByRole('button', { name: 'Gửi câu hỏi', exact: true }).click();
  await expect(page.getByTestId('bot-message-1')).toContainText('Tôi muốn phân loại chai nhựa');
  await expect(
    page.getByRole('textbox', { name: 'Câu hỏi cho RecycleBot', exact: true }),
  ).toHaveValue('');
  await page.getByRole('button', { name: 'Mở Sổ tay', exact: true }).click();
  await expect(page).toHaveURL(/\/handbook/);
});
test('suggestions add a question and cancelling listening adds no voice message', async ({
  page,
}) => {
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Hỏi về xử lý pin củ', exact: true }).click();
  await expect(page.getByTestId('bot-message-1')).toContainText('xử lý pin củ');
  await page.getByRole('button', { name: 'Mở bảng nghe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dừng nghe', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Đóng ghi âm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Phát giọng nói', exact: true })).toHaveCount(0);
});
test('listening start and stop add a voice row with play and pause controls', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Mở bảng nghe', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu nghe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dừng nghe', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Dừng nghe', exact: true }).click();
  await page.getByRole('button', { name: 'Phát giọng nói', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng giọng nói', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Phát giọng nói', exact: true })).toBeVisible();
});
