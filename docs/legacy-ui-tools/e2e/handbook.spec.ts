import { test, expect } from '@playwright/test';

test('classification tables connect the original learn-more buttons and return to the guide', async ({
  page,
}) => {
  await page.goto('/handbook/plastic');
  await page.getByRole('button', { name: 'Tùy chọn hướng dẫn', exact: true }).click();
  await page.getByRole('button', { name: 'Bảng phân loại rác', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Các loại rác thải nhựa phổ biến', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tìm hiểu về Pin', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Các loại Pin phổ biến', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tìm hiểu về Nilong', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Các loại Nilong phổ biến', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tìm hiểu về Dc Y Tế', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Các Dụng cụ Y Tế phổ biến', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn bảng phân loại', exact: true }).click();
  await page.getByRole('button', { name: 'Sổ tay rác', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sổ tay rác', exact: true })).toBeVisible();
});

test('original handbook navigation opens each of its five destinations', async ({ page }) => {
  for (const [label, destination] of [
    ['Trang chủ', '/'],
    ['Thu gom', '/collection'],
    ['Đổi quà', '/rewards'],
    ['Cá nhân', '/profile'],
    ['Quét rác', '/scan'],
  ] as const) {
    await page.goto('/handbook/category/recycle');
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.replaceAll('/', '\\/')}$`));
  }
});

test('category instructions close with Escape and filtered material keeps its detail route', async ({
  page,
}) => {
  await page.goto('/handbook/category/inorganic');
  await page.getByRole('button', { name: 'Cách xử lý Rác vô cơ', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cách xử lý:', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const search = page.getByRole('textbox', { name: 'Tìm kiếm trong sổ tay rác', exact: true });
  await search.fill('pin');
  await expect(page.getByRole('button', { name: 'Đồ dùng bằng cao su', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Pin - Ắc quy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(search).toHaveValue('pin');
});

test('a direct category instruction link can close and reopen its original list', async ({
  page,
}) => {
  await page.goto('/handbook/category/recycle?expanded=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng hướng dẫn phân loại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rác tái chế', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cách xử lý Rác tái chế', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('button', { name: 'Đóng hướng dẫn', exact: true })
    .click({ position: { x: 10, y: 700 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('handbook categories filter the list and its material opens the correct guide', async ({
  page,
}) => {
  await page.goto('/handbook');
  await page.getByRole('button', { name: 'Rác hữu cơ', exact: true }).click();
  await expect(page).toHaveURL(/\/handbook\/category\/organic/);
  await expect(page.getByRole('heading', { name: 'Rác hữu cơ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pin - Ắc quy', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đồ ăn thừa - Vỏ trái cây', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rác hữu cơ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tùy chọn hướng dẫn', exact: true }).click();
  await page.getByRole('button', { name: 'Sổ tay rác', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem tất cả', exact: true })).toBeVisible();
});

test('handbook search accepts Vietnamese without accents and returns from the guide', async ({
  page,
}) => {
  await page.goto('/handbook');
  const search = page.getByRole('textbox', { name: 'Tìm kiếm trong sổ tay rác', exact: true });
  await search.fill('thuy tinh');
  await search.press('Enter');
  await page.getByRole('button', { name: 'Thủy tinh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thủy tinh', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Xem mẹo tái sử dụng', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Xem mẹo tái sử dụng', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
  await expect(search).toHaveValue('thuy tinh');
});
