import { safeAuthReturn } from './auth-return';

export const notificationTarget = (value: unknown) => safeAuthReturn(value);

export function notificationTargetLabel(path: string) {
  const pathname = path.split('?')[0] ?? path;
  if (pathname === '/event-ticket') return 'Xem vé tham gia';
  if (pathname === '/event-summary') return 'Xem tổng kết hoạt động';
  if (pathname.startsWith('/events/')) return 'Xem hoạt động';
  if (pathname === '/rewards/redemption') return 'Xem quà đã đổi';
  if (pathname.startsWith('/rewards')) return 'Xem quà và ưu đãi';
  if (pathname === '/conversation' || pathname === '/messages') return 'Mở tin nhắn';
  if (pathname === '/discussion' || pathname === '/articles/discussion') return 'Xem thảo luận';
  if (pathname.startsWith('/articles/')) return 'Xem bài viết';
  if (pathname === '/game') return 'Mở phòng chơi';
  if (pathname === '/scan') return 'Xem kết quả quét';
  if (pathname.startsWith('/handbook')) return 'Xem hướng dẫn phân loại';
  if (pathname === '/point-proposal') return 'Xem đề xuất điểm thu gom';
  if (pathname === '/point-report') return 'Xem báo cáo điểm thu gom';
  return 'Xem nội dung liên quan';
}
