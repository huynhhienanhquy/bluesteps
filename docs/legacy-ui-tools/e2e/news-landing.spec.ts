import { test, expect } from '@playwright/test';

test('news landing opens search, the original featured article, saved stories and menu destinations', async ({
  page,
}) => {
  await page.goto('/articles');
  await expect(page.getByRole('button', { name: 'Đọc bài nổi bật', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tìm bài viết', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/search$/);
  await expect(page.getByRole('textbox', { name: 'Tìm kiếm tin tức', exact: true })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'Đọc bài nổi bật', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/daily-waste$/);
  await page.goBack();
  await page
    .getByRole('button', { name: 'Lưu bài Người dân tham gia dọn rác sau bảo số 13', exact: true })
    .click();
  await page.getByRole('button', { name: 'Bài đã lưu', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/saved$/);
  await expect(page.getByText('1 bài viết đã lưu', { exact: true })).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: 'Mở menu tin tức', exact: true }).click();
  await page.getByRole('button', { name: 'Chủ đề', exact: true }).click();
  await expect(page).toHaveURL(/\/articles\/topics$/);
  await expect(page.getByRole('heading', { name: 'Khám phá tin tức', exact: true })).toHaveCount(0);
  await page.goBack();
  await page.getByRole('button', { name: 'Tìm hiểu ngay', exact: true }).click();
  await expect(page).toHaveURL(/\/handbook$/);
});

test('latest news paginates all thirteen stories chronologically and preserves the chosen story ID', async ({
  page,
}) => {
  await page.goto('/articles?view=latest');
  const cards = page.getByRole('button', { name: /^Đọc / });
  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toHaveAccessibleName(
    'Đọc 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
  );
  await expect(
    page.getByRole('button', { name: 'Trang tin mới trước', exact: true }),
  ).toBeDisabled();
  const names: string[] = [];
  for (let index = 0; index < 4; index++) {
    await expect(cards).toHaveCount(index === 3 ? 1 : 4);
    names.push(
      ...(await cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')!),
      )),
    );
    if (index < 3)
      await page.getByRole('button', { name: 'Trang tin mới tiếp theo', exact: true }).click();
  }
  expect(new Set(names).size).toBe(13);
  await expect(
    page.getByRole('button', { name: 'Trang tin mới tiếp theo', exact: true }),
  ).toBeDisabled();
  await cards.first().click();
  await expect(page).toHaveURL(/\/articles\/youth-ideas$/);
});

test('event stories scroll to the last article, tabs keep preview state isolated and narrow screens stay usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 690 });
  await page.goto('/articles?view=events');
  await page
    .getByRole('button', { name: 'Đọc Các bạn trẻ với những ý tưởng xử lý rác thải', exact: true })
    .click();
  await expect(page).toHaveURL(/\/articles\/youth-ideas$/);
  await page.goBack();
  await page
    .getByRole('button', {
      name: 'Đọc 11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/articles\/daily-waste$/);
  await page.goto('/articles?preview=1');
  await page
    .getByRole('button', {
      name: 'Bỏ lưu bài Người dân tham gia dọn rác sau bảo số 13',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Tin mới nhất', exact: true }).click();
  await expect(page).toHaveURL(/view=latest&preview=1/);
  await page.getByRole('button', { name: 'Sự kiện sắp tới', exact: true }).click();
  await expect(page).toHaveURL(/view=events&preview=1/);
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await page.getByRole('button', { name: 'Bài đã lưu', exact: true }).click();
  await expect(page.getByText('0 bài viết đã lưu', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
