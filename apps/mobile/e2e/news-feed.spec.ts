import { test, expect } from '@playwright/test';

test('all thirteen news fixtures are reachable through pagination with local images', async ({
  page,
}) => {
  await page.goto('/articles?view=search');
  await expect(page.getByText('13 kết quả phù hợp', { exact: true })).toBeVisible();
  const names: string[] = [];
  for (let index = 0; index < 4; index++) {
    await expect(
      page.getByText(`Trang ${index + 1}/4 · 13 bài viết`, { exact: true }),
    ).toBeVisible();
    const cards = page.getByRole('button', { name: /^Đọc / });
    await expect(cards).toHaveCount(index === 3 ? 1 : 4);
    names.push(
      ...(await cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')!),
      )),
    );
    await expect
      .poll(() =>
        page
          .locator('img')
          .evaluateAll((images) =>
            images
              .filter(
                (image) =>
                  !(image instanceof HTMLImageElement) ||
                  !image.complete ||
                  image.naturalWidth === 0,
              )
              .map((image) => image.getAttribute('src')),
          ),
      )
      .toEqual([]);
    if (index < 3)
      await page.getByRole('button', { name: 'Trang bài tiếp theo', exact: true }).click();
  }
  expect(new Set(names).size).toBe(13);
  await page.getByRole('button', { name: 'Trang bài trước', exact: true }).click();
  await expect(page.getByText('Trang 3/4 · 13 bài viết', { exact: true })).toBeVisible();
});

test('saved news search recovers locally and topic aliases select the matching articles', async ({
  page,
}) => {
  await page.goto('/articles?view=search');
  await page.getByRole('button', { name: 'Tái chế', exact: true }).click();
  await expect(page.getByText('3 kết quả phù hợp', { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Lưu bài Người dân địa phương tham gia thu gom rác ...',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Bài đã lưu', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/reading-list$/);
  await page.getByRole('button', { name: 'Xem lưới bài đã lưu', exact: true }).click();
  await expect(page.getByText('1 bài viết đã lưu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sắp xếp bài đã lưu', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Tìm bài viết đã lưu', exact: true })
    .fill('khong co ket qua');
  await page.getByRole('button', { name: 'Đóng tùy chọn tin tức', exact: true }).click();
  await expect(page.getByText('Không tìm thấy bài viết phù hợp', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc Người dân địa phương tham gia thu gom rác ...',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('1 bài viết đã lưu', { exact: true })).toBeVisible();
});

test('saved-design preview uses original stories and removal never changes the actual session', async ({
  page,
}) => {
  await page.goto('/articles/saved?preview=1');
  await expect(page.getByText('6 bài viết đã lưu', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Bỏ lưu bài Ca Sỹ Thủy Tiên tham gia chủ nhật xanh', exact: true })
    .click();
  await page.getByRole('button', { name: 'Giữ bài đã lưu', exact: true }).click();
  await expect(page.getByText('6 bài viết đã lưu', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Bỏ lưu bài Ca Sỹ Thủy Tiên tham gia chủ nhật xanh', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xác nhận bỏ lưu bài', exact: true }).click();
  await expect(page.getByText('5 bài viết đã lưu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await page.getByRole('button', { name: 'Bài đã lưu', exact: true }).click();
  await expect(page.getByText('0 bài viết đã lưu', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa có bài viết đã lưu', { exact: true })).toBeVisible();
});
