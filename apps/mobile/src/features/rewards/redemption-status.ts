const labels: Record<string, string> = {
  reserved: 'Đã giữ quà · chờ nhận',
  fulfilling: 'Đang chuẩn bị',
  fulfilled: 'Đã nhận quà',
  refunded: 'Đã hủy và hoàn điểm',
  needs_review: 'Cần hỗ trợ',
};

export function redemptionStatusLabel(status: string) {
  return labels[status] ?? 'Đang cập nhật trạng thái';
}
