import type { Schemas } from '../../services/api';

export function pointCapacityLabel(value: Schemas['CollectionPoint']['capacityState']) {
  return {
    unknown: 'Chưa rõ sức chứa',
    available: 'Còn chỗ',
    limited: 'Sắp đầy',
    full: 'Đã đầy',
    closed: 'Tạm đóng cửa',
  }[value];
}
