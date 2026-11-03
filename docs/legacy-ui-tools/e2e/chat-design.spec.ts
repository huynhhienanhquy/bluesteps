import { expect, test } from '@playwright/test';

test('searching contacts and sending text preserve the conversation and list preview', async ({
  page,
}) => {
  await page.goto('/messages');
  await page.getByRole('textbox', { name: 'Tìm hội thoại', exact: true }).fill('Thu Phương');
  await expect(
    page.getByRole('button', { name: 'Hội thoại Nguyễn Thị Linh Chi', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Hội thoại Thu Phương', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })
    .fill('Mình sẽ tham gia thu gom cuối tuần này');
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(
    page
      .getByText('Mình sẽ tham gia thu gom cuối tuần này', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(
    page
      .getByText('Mình sẽ tham gia thu gom cuối tuần này', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hội thoại Thu Phương', exact: true }).click();
  await expect(
    page
      .getByText('Mình sẽ tham gia thu gom cuối tuần này', { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(1);
});

test('emoji and keyboard keys append to the draft and clear it after sending', async ({ page }) => {
  await page.goto('/conversation?id=linh-chi');
  await page.getByRole('button', { name: 'Chọn emoji', exact: true }).click();
  await page.getByRole('button', { name: 'Emoji 💚', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(page.getByText('😊💚', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true }).click();
  await page.getByRole('button', { name: 'Phím Q', exact: true }).click();
  await page.getByRole('button', { name: 'Phím cách', exact: true }).click();
  await page.getByRole('button', { name: 'Phím W', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })).toHaveValue(
    'q w',
  );
  await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true })).toHaveValue(
    '',
  );
  await expect(page.getByText('q w', { exact: true })).toBeVisible();
});

test('photo and file pickers send the selected media and metadata to the current conversation', async ({
  page,
}) => {
  await page.goto('/conversation?id=linh-chi');
  await page.getByRole('button', { name: 'Đính kèm', exact: true }).click();
  await page.getByRole('button', { name: 'Ảnh và video', exact: true }).click();
  await page.getByRole('button', { name: 'Ảnh 2', exact: true }).click();
  await page.getByRole('textbox', { name: 'Chú thích ảnh', exact: true }).fill('Bãi biển hôm nay');
  await page.getByRole('button', { name: 'Gửi ảnh', exact: true }).click();
  await expect(page.getByText('Bãi biển hôm nay', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chọn tệp', exact: true }).click();
  await page.getByRole('button', { name: 'Tệp tài liệu', exact: true }).click();
  await page.getByRole('button', { name: 'Gửi Lich-thu-gom-thang-10.pdf', exact: true }).click();
  await expect(page.getByText('Lich-thu-gom-thang-10.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở Lich-thu-gom-thang-10.pdf', exact: true }).click();
  await expect(
    page.getByText('PDF · 860 KB', { exact: true }).filter({ visible: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
});

test('cancelled voice recording sends nothing and a sent voice message can toggle playback UI', async ({
  page,
}) => {
  await page.goto('/conversation?id=linh-chi');
  await page.getByRole('button', { name: 'Ghi âm', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy ghi âm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Phát ghi âm', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ghi âm', exact: true }).click();
  await expect(page.getByText(/Đang ghi âm\s+0:02/)).toBeVisible();
  await page.getByRole('button', { name: 'Gửi ghi âm', exact: true }).click();
  await page.getByRole('button', { name: 'Phát ghi âm', exact: true }).click();
  await page.getByRole('button', { name: 'Tạm dừng ghi âm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Phát ghi âm', exact: true })).toBeVisible();
});

test('community share picker sends a post to the chosen recipient and opens its details', async ({
  page,
}) => {
  await page.goto('/community');
  await page.getByRole('button', { name: 'Chia sẻ bài đăng', exact: true }).first().click();
  await page.getByRole('button', { name: 'Gửi đến Nguyễn Quang Huy', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Trang cá nhân Nguyễn Quang Huy', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mở bài viết đã chia sẻ', exact: true }).click();
  await expect(page.getByText('Bài đăng', { exact: true })).toBeVisible();
});
