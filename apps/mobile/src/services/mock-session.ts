/** Fixed, synthetic demo snapshot. Amounts are examples, never point-award policy. */
export const mockProfile = {
  id: 'demo-linh-chi',
  displayName: 'Linh Chi',
  initials: 'LC',
  email: 'linhchi@example.test',
  city: 'Đà Nẵng',
  bio: 'Mỗi ngày một bước xanh.',
  joinedAt: '2026-10-01',
};
export const mockComments = [
  {
    id: 'comment-1',
    postId: 'post-1',
    author: 'Minh An',
    text: 'Góc phân loại gọn quá! Mình cũng sẽ thử dùng những chiếc hộp sẵn có.',
    time: '1 giờ trước · mẫu',
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    author: 'Thu Hà',
    text: 'Nhớ giữ giấy sạch và khô trước khi mang đi nhé.',
    time: '45 phút trước · mẫu',
  },
  {
    id: 'comment-3',
    postId: 'post-2',
    author: 'Linh Chi',
    text: 'Mình đang thử tra theo loại vật liệu trong mục Thu gom.',
    time: '2 giờ trước · mẫu',
  },
];
export const pointHistory = [
  {
    id: 'ledger-1',
    userId: mockProfile.id,
    occurredAt: '2026-10-05T08:00:00+07:00',
    title: 'Ghi nhận hoạt động mẫu đầu tháng',
    delta: 100,
    balanceAfter: 100,
  },
  {
    id: 'ledger-2',
    userId: mockProfile.id,
    occurredAt: '2026-10-12T09:00:00+07:00',
    title: 'Ghi nhận phân loại mẫu',
    delta: 80,
    balanceAfter: 180,
  },
  {
    id: 'ledger-3',
    userId: mockProfile.id,
    occurredAt: '2026-10-18T10:00:00+07:00',
    title: 'Đổi túi vải · dữ liệu lịch sử mẫu',
    delta: -120,
    balanceAfter: 60,
  },
  {
    id: 'ledger-4',
    userId: mockProfile.id,
    occurredAt: '2026-10-25T08:30:00+07:00',
    title: 'Ghi nhận hoạt động mẫu cuối tháng',
    delta: 120,
    balanceAfter: 180,
  },
];
export const mockWallet = {
  userId: mockProfile.id,
  balance: pointHistory.at(-1)!.balanceAfter,
  lifetimeEarned: pointHistory.reduce((total, entry) => total + Math.max(0, entry.delta), 0),
  spent: pointHistory.reduce((total, entry) => total + Math.max(0, -entry.delta), 0),
};
export const redemptionHistory = [
  {
    id: 'redemption-1',
    rewardId: 'tote',
    ledgerId: 'ledger-3',
    userId: mockProfile.id,
    cost: 120,
    status: 'Đã giao · minh họa',
    occurredAt: '2026-10-18T10:00:00+07:00',
  },
];
export const weeklyStatistics = [
  { id: 'week-1', label: '01–07/10', sortingCount: 3, collectedKg: 1.2 },
  { id: 'week-2', label: '08–14/10', sortingCount: 4, collectedKg: 2.4 },
  { id: 'week-3', label: '15–21/10', sortingCount: 2, collectedKg: 1.8 },
  { id: 'week-4', label: '22–28/10', sortingCount: 3, collectedKg: 3.0 },
];
export const mockStatistics = {
  period: 'Tháng 10/2026',
  sortingCount: weeklyStatistics.reduce((total, week) => total + week.sortingCount, 0),
  collectedKg: Number(
    weeklyStatistics.reduce((total, week) => total + week.collectedKg, 0).toFixed(1),
  ),
  activities: [
    { id: 'past-activity-1', title: 'Buổi phân loại tại khu phố · mẫu', date: '2026-10-12' },
    { id: 'past-activity-2', title: 'Ngày thu gom cuối tuần · mẫu', date: '2026-10-25' },
  ],
};
export type MockNotification = {
  id: string;
  title: string;
  body: string;
  icon: string;
  occurredAt: string;
  read: boolean;
  target: { kind: 'event' | 'article' | 'point'; id: string } | { kind: 'history' | 'onboarding' };
};
export const mockNotifications: MockNotification[] = [
  {
    id: 'notice-1',
    title: 'Khám phá buổi làm sạch biển',
    body: 'Xem hoạt động mẫu ngày 01/11. Chưa có đăng ký hoặc nhắc lịch thật.',
    icon: 'calendar-outline',
    occurredAt: '2026-10-29T08:00:00+07:00',
    read: false,
    target: { kind: 'event', id: 'beach' },
  },
  {
    id: 'notice-2',
    title: 'Bạn đã thử mang bình riêng chưa?',
    body: 'Một bài đọc mới trong bộ dữ liệu demo.',
    icon: 'book-outline',
    occurredAt: '2026-10-28T17:00:00+07:00',
    read: false,
    target: { kind: 'article', id: 'reuse' },
  },
  {
    id: 'notice-3',
    title: 'Tìm điểm tiếp nhận thủy tinh',
    body: 'Góc thủy tinh xanh là địa điểm giả lập để thử frontend.',
    icon: 'location-outline',
    occurredAt: '2026-10-28T09:00:00+07:00',
    read: false,
    target: { kind: 'point', id: 'glass-corner' },
  },
  {
    id: 'notice-4',
    title: 'Lịch sử điểm đã sẵn sàng để xem thử',
    body: 'Số dư, điểm thưởng và quà đều là dữ liệu mẫu.',
    icon: 'gift-outline',
    occurredAt: '2026-10-25T09:00:00+07:00',
    read: true,
    target: { kind: 'history' },
  },
  {
    id: 'notice-5',
    title: 'Chào mừng bạn đến BlueSteps',
    body: 'Khám phá những bước xanh đầu tiên qua hướng dẫn demo.',
    icon: 'leaf-outline',
    occurredAt: '2026-10-01T08:00:00+07:00',
    read: true,
    target: { kind: 'onboarding' },
  },
];
export type MockMessage = { id: number; mine: boolean; text: string; time: string };
export type MockConversation = {
  id: string;
  name: string;
  icon: string;
  unreadCount: number;
  messages: MockMessage[];
};
export const mockConversations: MockConversation[] = [
  {
    id: 'minh-an',
    name: 'Minh An',
    icon: 'person-circle-outline',
    unreadCount: 2,
    messages: [
      {
        id: 1,
        mine: false,
        text: 'Cuối tuần mình đang tìm điểm thu gom giấy. Bạn đã thử tra sổ tay chưa?',
        time: '08:30',
      },
      {
        id: 2,
        mine: true,
        text: 'Mình có rồi! Giấy cần giữ sạch và khô, sau đó kiểm tra điểm tiếp nhận.',
        time: '08:32',
      },
      { id: 3, mine: false, text: 'Hay quá, cùng bắt đầu thói quen xanh nhé!', time: '08:34' },
    ],
  },
  {
    id: 'thu-ha',
    name: 'Thu Hà',
    icon: 'person-circle-outline',
    unreadCount: 0,
    messages: [
      {
        id: 1,
        mine: true,
        text: 'Mình vừa thử mang bình nước riêng khi ra ngoài.',
        time: 'Hôm qua · 16:10',
      },
      {
        id: 2,
        mine: false,
        text: 'Mình thường để bình cạnh chìa khóa để không quên. Chúc bạn duy trì được nhé!',
        time: 'Hôm qua · 16:15',
      },
    ],
  },
  {
    id: 'recyclebot',
    name: 'RecycleBot',
    icon: 'sparkles-outline',
    unreadCount: 0,
    messages: [
      {
        id: 1,
        mine: false,
        text: 'Chào bạn! Mình là hướng dẫn demo với câu trả lời có sẵn, chưa kết nối AI hoặc ghi âm.',
        time: 'Hướng dẫn mẫu',
      },
      { id: 2, mine: true, text: 'Mình muốn biết cách xử lý chai nhựa.', time: 'Tin nhắn mẫu' },
      {
        id: 3,
        mine: false,
        text: 'Bạn có thể mở sổ tay, chọn Chai nhựa PET và kiểm tra loại nhựa điểm thu gom tiếp nhận. Đây là phản hồi mẫu.',
        time: 'Hướng dẫn mẫu',
      },
    ],
  },
];

export function formatDemoDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}
