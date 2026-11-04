import type { Href } from 'expo-router';
import type { Schemas } from '../../services/api';
import { safeAuthReturn } from '../../services/auth-return';

const labels: Record<string, string> = {
  sample_credit: 'Cộng điểm minh họa',
  sample_redemption: 'Đổi quà minh họa',
  sorting: 'Phân loại rác',
  sorting_action: 'Phân loại rác',
  daily_claim: 'Điểm danh',
  green_mission: 'Sứ mệnh xanh',
  redemption: 'Đổi quà',
  redemption_refund: 'Hoàn điểm đổi quà',
  adjustment: 'Điều chỉnh điểm',
  handover: 'Bàn giao rác',
  reward: 'Nhận thưởng',
};
export const pointTransactionTitle = (item: Schemas['PointTransaction']) =>
  item.sourceLabel?.trim() || labels[item.sourceType] || 'Giao dịch điểm';
export function pointTransactionDestination(
  item: Schemas['PointTransaction'],
  historyPeriod?: 'all' | 'month' | 'week',
): Href | undefined {
  const path = safeAuthReturn(item.targetPath);
  if (!path) return;
  if (historyPeriod && path.split('?')[0] === '/rewards/redemption') {
    const target = new URL(path, 'https://bluesteps.invalid');
    target.searchParams.set('historyPeriod', historyPeriod);
    return (target.pathname + target.search) as Href;
  }
  return path as Href;
}
