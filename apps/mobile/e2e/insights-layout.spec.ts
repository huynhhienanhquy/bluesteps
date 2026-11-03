import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Schemas } from '../src/services/api';

// UI-only variants. Domain behavior is checked separately through real HTTP/PostgreSQL.
const uid = '00000000-0000-4000-8000-000000000002';
const createdAt = '2026-11-02T02:00:00Z';
const profile: Schemas['Profile'] = {
  id: uid,
  displayName: 'Người kiểm thử',
  email: 'layout@example.test',
  birthDate: null,
  countryCode: null,
  bio: '',
  timezone: 'Asia/Ho_Chi_Minh',
  version: 1,
};
const wallet = { balance: '120', lifetimeEarned: '120', version: 1 };
const categories: Schemas['Breakdown'][] = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    code: 'category-0',
    name: 'Tái chế',
    actions: 9,
    weighedActions: 3,
    reportedWeightKg: '1.250',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    code: 'category-1',
    name: 'Hữu cơ',
    actions: 7,
    weighedActions: 2,
    reportedWeightKg: '0.750',
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    code: 'category-2',
    name: 'Vô cơ',
    actions: 4,
    weighedActions: 1,
    reportedWeightKg: '1.500',
  },
];
const targets: Schemas['PersonalTarget'][] = [
  {
    id: '00000000-0000-4000-8000-000000000021',
    title: 'Mười hành động xanh',
    metric: 'sorting_actions',
    target: '10',
    startsOn: '2026-10-01',
    endsOn: '2026-11-30',
    timezone: profile.timezone,
    progress: '20',
    completed: true,
    version: 1,
    createdAt,
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    title: 'Thu gom 5 kg vật liệu',
    metric: 'reported_weight_kg',
    target: '5',
    startsOn: '2026-10-01',
    endsOn: '2026-11-30',
    timezone: profile.timezone,
    progress: '3.500',
    completed: false,
    version: 1,
    createdAt,
  },
];
const counts = [
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 1],
  [2, 1, 1],
  [1, 1, 0],
  [1, 1, 1],
  [2, 2, 1],
];
const insights: Schemas['Insights'] = {
  timezone: profile.timezone,
  startsOn: '2026-10-27',
  endsOn: '2026-11-02',
  sortingActions: 20,
  periodActions: 20,
  weighedActions: 6,
  reportedWeightKg: '3.500',
  verifiedKg: null,
  categories,
  materials: categories.map((item, index) => ({
    ...item,
    name: ['Nhựa', 'Thực phẩm', 'Gốm sứ'][index]!,
    code: `material-${index}`,
  })),
  frequency: counts.map((row, index) => ({
    date: new Date(Date.UTC(2026, 9, 27 + index)).toISOString().slice(0, 10),
    actions: row.reduce((sum, value) => sum + value, 0),
    categories: Object.fromEntries(row.map((value, index) => [`category-${index}`, value])),
  })),
  targets,
  wallet,
};
const people: Schemas['LeaderboardEntry'][] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    displayName: 'Thành viên Một',
    rank: 1,
    points: '180',
  },
  { id: uid, displayName: profile.displayName, rank: 2, points: '120' },
  {
    id: '00000000-0000-4000-8000-000000000003',
    displayName: 'Thành viên Ba',
    rank: 3,
    points: '90',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    displayName: 'Thành viên Bốn',
    rank: 4,
    points: '60',
  },
];
const badges: Schemas['Milestone'][] = [
  {
    code: 'first-sort',
    title: 'Bước đầu phân loại',
    progress: 20,
    target: 1,
    earned: true,
    earnedAt: createdAt,
  },
  {
    code: 'ten-sorts',
    title: 'Mười hành động xanh',
    progress: 20,
    target: 10,
    earned: true,
    earnedAt: createdAt,
  },
  {
    code: 'first-event',
    title: 'Góp sức cùng cộng đồng',
    progress: 0,
    target: 1,
    earned: false,
    earnedAt: null,
  },
];
const directory = join(process.cwd(), '../../docs/figma-completion/insights-layout-isolated');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.addInitScript(() => {
    if (window.top === window) localStorage.setItem('bluesteps.onboarding.v1', 'complete');
  });
  await page.route('**/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const json =
      path === '/v1/auth/web/refresh'
        ? { accessToken: 'ui-layout-session', sessionId: uid }
        : path === '/v1/me'
          ? profile
          : path === '/v1/me/preferences'
            ? {
                theme: 'light',
                sound: false,
                haptics: false,
                timezone: profile.timezone,
                locale: 'vi',
                interests: [],
                goal: null,
                version: 1,
              }
            : path === '/v1/me/insights'
              ? insights
              : path === '/v1/me/badges'
                ? badges
                : path === '/v1/me/leaderboard'
                  ? { items: people, nextCursor: null }
                  : path === '/v1/me/achievement-summary'
                    ? {
                        lifetimeEarned: '120',
                        level: 2,
                        nextThreshold: '200',
                        rank: 2,
                        leaderboard: { optedIn: true, version: 1 },
                      }
                    : path === '/v1/me/notifications/summary'
                      ? { total: 1, unread: 1, activity: 1 }
                      : null;
    return route.fulfill(
      json
        ? { json }
        : { status: 404, json: { error: { code: 'NOT_FOUND', message: 'Không tìm thấy.' } } },
    );
  });
});

for (const width of [390, 428]) {
  test(`charts, target editor and ranking variants at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    const height = width === 390 ? 844 : 926;
    await page.setViewportSize({ width, height });
    mkdirSync(directory, { recursive: true });
    await page.goto('/statistics');
    await expect(page.getByText('20 lượt phân loại', { exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Đang tải', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Trang chủ', exact: true })).toBeInViewport({
      ratio: 0.999,
    });
    await page.screenshot({
      path: join(directory, `summary-${width}.png`),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Theo kg tự khai', exact: true }).click();
    await page.screenshot({ path: join(directory, `weight-${width}.png`), animations: 'disabled' });
    await page
      .getByRole('heading', { name: 'Tần suất phân loại', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(directory, `frequency-${width}.png`),
      animations: 'disabled',
    });
    await page
      .getByRole('heading', { name: 'Mục tiêu & Thành tựu', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(directory, `targets-${width}.png`),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Thêm mục tiêu', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mục tiêu mới', exact: true })).toBeVisible();
    await page.screenshot({
      path: join(directory, `target-editor-${width}.png`),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.goto('/achievements');
    await expect(
      page.getByRole('button', { name: 'Rời bảng xếp hạng', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Đang tải', exact: true })).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: join(directory, `achievements-${width}.png`),
      animations: 'disabled',
    });
    await page.getByText('Hạng 1', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `podium-${width}.png`), animations: 'disabled' });
    await page
      .getByRole('heading', { name: 'Cột mốc hoạt động', exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: join(directory, `milestones-${width}.png`),
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
