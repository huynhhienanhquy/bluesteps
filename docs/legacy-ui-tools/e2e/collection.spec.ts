import { expect, test } from '@playwright/test';

test('route steps switch travel mode, validate departure time and open sample navigation', async ({
  page,
}) => {
  await page.goto('/collection-directions');
  await page.getByRole('button', { name: 'Xem các chặng', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Các chặng', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xe máy', exact: true }).click();
  await expect(page.getByText('4 phút (2,0 km)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đổi giờ khởi hành', exact: true }).click();
  await page.getByRole('textbox', { name: 'Giờ khởi hành', exact: true }).fill('25:99');
  await expect(page.getByRole('button', { name: 'Lưu giờ khởi hành', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Giờ khởi hành', exact: true }).fill('14:30');
  await page.getByRole('button', { name: 'Lưu giờ khởi hành', exact: true }).click();
  await expect(page.getByText('Khởi hành lúc 14:30', { exact: true })).toBeVisible();
  const avoid = page.getByRole('button', { name: 'Tránh trạm thu phí, tùy chọn 1', exact: true });
  await avoid.click();
  await expect(avoid).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await page.getByRole('button', { name: 'Xem chỉ đường mẫu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã đến nơi', exact: true })).toBeVisible();
});

test('explore map opens its filters and carries a submitted search into nearby results', async ({
  page,
}) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Tùy chọn bản đồ', exact: true }).click();
  await page.getByRole('button', { name: 'Bản đồ khám phá', exact: true }).click();
  await page.getByRole('button', { name: 'Bộ lọc điểm thu gom', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đề xuất địa điểm', exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Tìm điểm thu gom', exact: true });
  await input.fill('pin an toan');
  await input.press('Enter');
  await expect(page).toHaveURL(/collection\?query=pin/);
  await page.getByRole('button', { name: 'Xem điểm thu gom Hộp pin an toàn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hộp pin an toàn', exact: true })).toBeVisible();
});

test('replacement changes only the first stop and keeps the following battery stop', async ({
  page,
}) => {
  await page.goto('/collection-navigation');
  await page.getByRole('button', { name: 'Tìm điểm thay thế', exact: true }).click();
  await page.getByRole('radio', { name: 'Điểm tái chế Khuê Mỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Thay điểm dừng đầu tiên', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hành trình thu gom', exact: true }),
  ).toBeVisible();
  const stops = page.getByRole('button', { name: /^Xóa / });
  await expect(stops).toHaveCount(2);
  await expect(stops.first()).toHaveAttribute('aria-label', 'Xóa Điểm tái chế Khuê Mỹ');
  await expect(stops.nth(1)).toHaveAttribute('aria-label', 'Xóa Trạm xanh Hòa Hải');
  await expect(page.getByText('2,7 km', { exact: true })).toBeVisible();
});

test('point photos, route preview, arrival checks and the next stop are connected', async ({
  page,
}) => {
  await page.goto('/points/green-hub');
  await page.getByRole('button', { name: 'Xem ảnh 1 của điểm thu gom', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ảnh điểm thu gom', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng bảng tùy chọn', exact: true }).click();
  await page.getByRole('button', { name: 'Chỉ đường', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lái xe', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await page.getByRole('button', { name: 'Xem chỉ đường mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Tắt âm thanh chỉ đường', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bật âm thanh chỉ đường', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đã đến nơi', exact: true }).click();
  await page.getByRole('button', { name: 'Tôi đã bàn giao xong', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Hoàn thành các mục kiểm tra');
  await page
    .getByRole('checkbox', { name: 'Bỏ đúng ngăn theo nhãn tại điểm', exact: true })
    .click();
  await page.getByRole('button', { name: 'Tôi đã bàn giao xong', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đã xác nhận trong phiên mẫu', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Không cộng điểm thưởng/)).toBeVisible();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục đến điểm tiếp theo', exact: true }).click();
  await expect(page).toHaveURL(/collection-directions\?point=paper-house/);
  await expect(page.getByRole('button', { name: 'Đổi điểm đến', exact: true })).toContainText(
    'Trạm xanh Hòa Hải',
  );
});

test('filter drafts cancel, radius accepts keyboard input and applied choices survive reopening', async ({
  page,
}) => {
  await page.goto('/collection');
  const openFilters = async () => {
    await page.getByRole('button', { name: 'Tùy chọn bản đồ', exact: true }).click();
    await page.getByRole('button', { name: 'Bộ lọc điểm thu gom', exact: true }).click();
  };
  await openFilters();
  await page.getByRole('checkbox', { name: 'Pin đã dùng', exact: true }).click();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await openFilters();
  await expect(page.getByRole('checkbox', { name: 'Pin đã dùng', exact: true })).not.toBeChecked();
  const slider = page.getByRole('slider', { name: 'Bán kính tìm kiếm', exact: true });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '3.5');
  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '0.5');
  await page.getByRole('button', { name: 'Trong 3 km', exact: true }).click();
  await page.getByRole('switch', { name: 'Có nhân viên hỗ trợ', exact: true }).click();
  await page.getByRole('button', { name: 'Áp dụng • 3 điểm phù hợp', exact: true }).click();
  await openFilters();
  await expect(
    page.getByRole('switch', { name: 'Có nhân viên hỗ trợ', exact: true }),
  ).toBeChecked();
});

test('comparison selection drives the first journey stop and permits removing it', async ({
  page,
}) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'So sánh', exact: true }).click();
  await expect(page.getByText('850 m · 12 phút', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Trạm xanh Hòa Hải', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Trạm xanh Hòa Hải', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Chỉ đường đến điểm đã chọn', exact: true }).click();
  const remove = page.getByRole('button', { name: /^Xóa / });
  await expect(remove.first()).toHaveAttribute('aria-label', 'Xóa Trạm xanh Hòa Hải');
  await remove.first().click();
  await expect(
    page.getByText('Trạm xanh Hòa Hải', { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Thêm điểm dừng', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Trạm xanh Hòa Hải', exact: true }).click();
  await expect(
    page.getByText('Trạm xanh Hòa Hải', { exact: true }).filter({ visible: true }),
  ).toBeVisible();
});

test('journey supports accessible reorder, drag, origin edits and local handoff instructions', async ({
  page,
}) => {
  await page.goto('/journey');
  await page.getByRole('button', { name: 'Sắp xếp Trạm xanh Hòa Hải', exact: true }).click();
  await page.getByRole('button', { name: 'Chuyển lên', exact: true }).click();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  const remove = page.getByRole('button', { name: /^Xóa / });
  await expect(remove.first()).toHaveAttribute('aria-label', 'Xóa Trạm xanh Hòa Hải');
  const grip = page.getByRole('button', { name: 'Sắp xếp Trạm xanh Hòa Hải', exact: true });
  await grip.scrollIntoViewIfNeeded();
  const box = await grip.boundingBox();
  if (!box) throw new Error('Missing reorder handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 12 });
  await page.mouse.up();
  await expect(remove.first()).toHaveAttribute('aria-label', 'Xóa Công viên cộng đồng A');
  await page.getByRole('button', { name: 'Đổi vị trí khởi hành', exact: true }).click();
  await page.getByRole('textbox', { name: 'Địa điểm khởi hành', exact: true }).fill('Nhà của tôi');
  await page.getByRole('button', { name: 'Lưu vị trí khởi hành', exact: true }).click();
  await expect(page.getByText('Khởi hành từ Nhà của tôi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu hành trình • 2 điểm', exact: true }).click();
  await expect(page.getByText(/chưa có dẫn đường trực tiếp/)).toBeVisible();
  await page.getByRole('button', { name: 'Xem hướng dẫn bàn giao', exact: true }).click();
  await expect(page.getByText('Trước khi bàn giao', { exact: true })).toBeVisible();
});
