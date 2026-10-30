import { demoData } from '../demo';
import { articles, collectionPoints, events, initialPosts, rewards, wasteItems } from '../fixtures';
import { createDemoSession, appendDemoMessage } from '../demo-session';
import {
  mockConversations,
  mockComments,
  mockNotifications,
  mockProfile,
  mockStatistics,
  mockWallet,
  pointHistory,
  redemptionHistory,
  weeklyStatistics,
} from '../mock-session';

test('all demo datasets have stable, unique IDs and valid cross references', () => {
  for (const rows of Object.values(demoData)) {
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  }
  const seed = createDemoSession();
  expect(
    mockComments.every((comment) => initialPosts.some((post) => post.id === comment.postId)),
  ).toBe(true);
  expect(seed.saved.every((id) => events.some((event) => event.id === id))).toBe(true);
  expect(seed.liked.every((id) => initialPosts.some((post) => post.id === id))).toBe(true);
  expect(seed.stops.every((id) => collectionPoints.some((point) => point.id === id))).toBe(true);
  for (const notification of mockNotifications) {
    const target = notification.target;
    if ('id' in target) {
      const rows =
        target.kind === 'event' ? events : target.kind === 'article' ? articles : collectionPoints;
      expect(rows.some((row) => row.id === target.id)).toBe(true);
    }
    expect(Number.isFinite(Date.parse(notification.occurredAt))).toBe(true);
  }
  expect(
    collectionPoints.every((point) =>
      point.materials.every((material) => wasteItems.some((item) => item.material === material)),
    ),
  ).toBe(true);
  for (const conversation of mockConversations) {
    expect(new Set(conversation.messages.map((message) => message.id)).size).toBe(
      conversation.messages.length,
    );
  }
});

test('the example wallet reconciles with the seeded ledger and redeemed reward', () => {
  let balance = 0;
  for (const entry of pointHistory) {
    balance += entry.delta;
    expect(entry.balanceAfter).toBe(balance);
    expect(entry.userId).toBe(mockProfile.id);
  }
  expect(balance).toBe(mockWallet.balance);
  expect(mockWallet.lifetimeEarned - mockWallet.spent).toBe(mockWallet.balance);
  for (const redemption of redemptionHistory) {
    expect(
      rewards.some(
        (reward) => reward.id === redemption.rewardId && reward.cost === redemption.cost,
      ),
    ).toBe(true);
    expect(pointHistory.find((entry) => entry.id === redemption.ledgerId)?.delta).toBe(
      -redemption.cost,
    );
  }
  expect(mockStatistics.sortingCount).toBe(
    weeklyStatistics.reduce((sum, week) => sum + week.sortingCount, 0),
  );
  expect(mockStatistics.collectedKg).toBeCloseTo(
    weeklyStatistics.reduce((sum, week) => sum + week.collectedKg, 0),
  );
});

test('demo sessions reset to independent seeded copies', () => {
  const first = createDemoSession();
  const original = createDemoSession();
  first.posts[0]!.text = 'changed';
  first.saved.length = 0;
  first.stops.reverse();
  first.notifications[0]!.read = true;
  first.conversations[0]!.messages[0]!.text = 'changed';
  expect(createDemoSession()).toEqual(original);
});

test('messages stay in the chosen conversation and rapid demo sends keep unique IDs', () => {
  const original = createDemoSession().conversations;
  const once = appendDemoMessage(original, 'minh-an', 'Tin nhắn thứ nhất');
  const twice = appendDemoMessage(once, 'minh-an', 'Tin nhắn thứ hai');
  expect(twice.find((item) => item.id === 'thu-ha')).toEqual(
    original.find((item) => item.id === 'thu-ha'),
  );
  const messages = twice.find((item) => item.id === 'minh-an')!.messages;
  expect(messages.at(-1)?.text).toBe('Tin nhắn thứ hai');
  expect(new Set(messages.map((message) => message.id)).size).toBe(messages.length);
  expect(original.find((item) => item.id === 'minh-an')!.messages).toHaveLength(3);
  expect(appendDemoMessage(twice, 'minh-an', '   ')).toBe(twice);
  const bot = appendDemoMessage(original, 'recyclebot', 'Cách phân loại?').find(
    (item) => item.id === 'recyclebot',
  )!;
  expect(bot.messages.at(-1)?.text).toContain('Chưa gọi mô hình AI');
});
