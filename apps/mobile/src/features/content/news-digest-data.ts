import type { GreenEvent } from '../../services/fixtures';

/** Isolated editorial examples copied from design context. They never create catalog events. */
export const calendarExamples: GreenEvent[] = [
  {
    id: 'preview-nhieu-loc',
    title: 'Dọn rác ven kênh Nhiêu Lộc',
    date: '2026-11-02',
    day: '02',
    month: 'TH11',
    time: '07:30 – 09:30',
    area: 'TP. Hồ Chí Minh',
    icon: 'water-outline',
    category: 'Thu gom',
    description:
      'Mẫu trong thiết kế Figma. Chưa có lịch tổ chức, đơn vị phụ trách hoặc đăng ký được xác minh.',
  },
  {
    id: 'preview-tao-dan',
    title: 'Ngày hội đổi rác lấy cây',
    date: '2026-11-08',
    day: '08',
    month: 'TH11',
    time: '09:00 – 11:00',
    area: 'Công viên Tao Đàn',
    icon: 'leaf-outline',
    category: 'Workshop',
    description:
      'Mẫu trong thiết kế Figma. Chưa xác minh sự kiện, giờ kết thúc minh họa; không có giữ chỗ hoặc đổi cây thật.',
  },
  {
    id: 'preview-workshop',
    title: 'Workshop phân loại rác',
    date: '2026-11-15',
    day: '15',
    month: 'TH11',
    time: '14:00 – 16:00',
    area: 'Nhà văn hóa Thanh niên',
    icon: 'school-outline',
    category: 'Giáo dục',
    description:
      'Mẫu trong thiết kế Figma. Lịch/địa điểm chưa được xác nhận; giờ kết thúc chỉ dùng minh họa.',
  },
];
export const briefExamples = [
  {
    id: 'preview-plastic',
    title: 'Rác nhựa đang đi đâu?',
    summary:
      'Một phần lớn rác nhựa vẫn trôi ra sông, kênh và biển. Hãy bắt đầu từ việc giảm đồ dùng một lần.',
    relatedArticle: 'daily-waste',
  },
  {
    id: 'preview-community',
    title: 'Cộng đồng cùng hành động',
    summary: 'Các nhóm tình nguyện tiếp tục dọn rác tại nhiều khu vực công cộng cuối tuần này.',
    relatedArticle: 'community-day',
  },
  {
    id: 'preview-tip',
    title: 'Mẹo xanh trong ngày',
    summary: 'Mang bình nước cá nhân và túi vải khi ra ngoài để giảm rác phát sinh.',
    relatedArticle: 'reuse',
  },
];
export function selectNewsEvents(
  items: GreenEvent[],
  month: string,
  date: string,
  category: string,
) {
  return items
    .filter(
      (event) =>
        (category === 'Tất cả' || event.category === category) &&
        (date ? event.date === date : event.date.startsWith(month)),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id),
    );
}
export function digestDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const day = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'][
    parsed.getUTCDay()
  ]!;
  return {
    day,
    label: `${parsed.getUTCDate()} tháng ${parsed.getUTCMonth() + 1}`,
    year: parsed.getUTCFullYear(),
  };
}
