/** Editorial event from backuped 680:5461. It is a local example, not a confirmed event. */
export const newsEvents = [
  {
    id: 'nhieu-loc',
    title: 'Dọn rác ven kênh Nhiêu Lộc cùng BlueSteps',
    date: '2026-11-02',
    day: '02',
    month: 'TH11',
    time: '07:30 – 11:00',
    area: 'Kênh Nhiêu Lộc, TP. Hồ Chí Minh',
    category: 'Thu gom',
    icon: 'water-outline',
    description: 'Cùng cộng đồng biến một buổi sáng thành thay đổi tích cực cho thành phố.',
    about:
      'Tham gia thu gom và phân loại rác cùng các tình nguyện viên. Dụng cụ sẽ được chuẩn bị tại điểm hẹn; bạn chỉ cần mang theo nước uống và tinh thần sẵn sàng.',
    schedule: [
      ['07:30', 'Tập trung'],
      ['08:00', 'Thu gom'],
      ['10:30', 'Tổng kết'],
    ],
  },
];

export function rememberNewsSearch(previous: string[], value: string) {
  const term = value.trim().replace(/\s+/g, ' ').slice(0, 100);
  if (!term) return previous;
  const normalized = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase();
  return [term, ...previous.filter((entry) => normalized(entry) !== normalized(term))].slice(0, 3);
}
