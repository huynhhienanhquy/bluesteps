export type CollectionFilters = {
  materials: string[];
  radius: number;
  hours: 'all' | 'open' | 'always';
  available: boolean;
  staffed: boolean;
  applied: boolean;
};
export const defaultCollectionFilters = (): CollectionFilters => ({
  materials: ['Nhựa', 'Giấy, bìa'],
  radius: 3,
  hours: 'open',
  available: true,
  staffed: false,
  applied: false,
});
export type DesignPoint = {
  id: string;
  name: string;
  cardName: string;
  address: string;
  distance: number;
  minutes: number;
  materials: string[];
  hours: string;
  open: boolean;
  available: boolean;
  staffed: boolean;
  always?: boolean;
};
const address = '460 Trần Đại Nghĩa,Ngũ Hành Sơn,TP. Đà Nẵng';
export const designPoints: DesignPoint[] = [
  {
    id: 'green-hub',
    name: 'Công viên cộng đồng A',
    cardName: 'Thùng rác cộng đồng- Công Viên A',
    address,
    distance: 0.2,
    minutes: 5,
    materials: ['Nhựa', 'Giấy, bìa', 'Kim loại', 'Rác hữu cơ'],
    hours: 'Mở suốt ngày',
    always: true,
    open: true,
    available: true,
    staffed: false,
  },
  {
    id: 'paper-house',
    name: 'Trạm xanh Hòa Hải',
    cardName: 'Trạm xanh Hòa Hải',
    address: '120 Lê Văn Hiến, Đà Nẵng',
    distance: 0.85,
    minutes: 12,
    materials: ['Nhựa', 'Giấy, bìa', 'Pin đã dùng', 'Thủy tinh'],
    hours: '07:00–18:00',
    open: true,
    available: true,
    staffed: true,
  },
  {
    id: 'battery-box',
    name: 'Hộp pin an toàn',
    cardName: 'Hộp pin an toàn',
    address: 'Điểm thu gom mô phỏng tại Ngũ Hành Sơn',
    distance: 1.2,
    minutes: 18,
    materials: ['Pin đã dùng', 'Điện tử'],
    hours: '08:00 – 17:00',
    open: true,
    available: true,
    staffed: true,
  },
  {
    id: 'glass-corner',
    name: 'Góc thủy tinh xanh',
    cardName: 'Góc thủy tinh xanh',
    address: 'Điểm thu gom mô phỏng tại Hòa Hải',
    distance: 1.6,
    minutes: 22,
    materials: ['Nhựa', 'Giấy, bìa', 'Thủy tinh'],
    hours: 'Mở 24 giờ',
    open: true,
    always: true,
    available: true,
    staffed: false,
  },
  {
    id: 'recycle-station',
    name: 'Trạm tái chế cuối tuần',
    cardName: 'Trạm tái chế cuối tuần',
    address: 'Điểm thu gom mô phỏng tại Ngũ Hành Sơn',
    distance: 2,
    minutes: 28,
    materials: ['Nhựa', 'Giấy, bìa', 'Quần áo'],
    hours: '08:00 – 20:00',
    open: true,
    available: true,
    staffed: true,
  },
  {
    id: 'paper-school',
    name: 'Điểm giấy trường học',
    cardName: 'Điểm giấy trường học',
    address: 'Điểm thu gom mô phỏng tại Ngũ Hành Sơn',
    distance: 2.4,
    minutes: 32,
    materials: ['Giấy, bìa'],
    hours: '07:00 – 18:00',
    open: true,
    available: true,
    staffed: true,
  },
  {
    id: 'green-corner',
    name: 'Góc xanh khu phố',
    cardName: 'Góc xanh khu phố',
    address: 'Điểm thu gom mô phỏng tại Ngũ Hành Sơn',
    distance: 2.8,
    minutes: 36,
    materials: ['Nhựa', 'Giấy, bìa'],
    hours: 'Mở 24 giờ',
    open: true,
    always: true,
    available: true,
    staffed: false,
  },
  {
    id: 'organic-garden',
    name: 'Vườn ủ cộng đồng',
    cardName: 'Vườn ủ cộng đồng',
    address: 'Điểm thu gom mô phỏng tại Cẩm Lệ',
    distance: 5.6,
    minutes: 70,
    materials: ['Rác hữu cơ'],
    hours: '07:00 – 11:00',
    open: false,
    available: false,
    staffed: false,
  },
];
export const foldCollection = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export const replacementPoints: (DesignPoint & { extraDistance: string; extraMinutes: number })[] =
  [
    {
      id: 'tan-tra',
      name: 'Góc tái chế Tân Trà',
      cardName: 'Góc tái chế Tân Trà',
      address: '18 Tân Trà, Ngũ Hành Sơn, Đà Nẵng',
      distance: 0.65,
      minutes: 8,
      materials: ['Nhựa', 'Giấy, bìa', 'Kim loại'],
      hours: 'Mở đến 18:00',
      open: true,
      available: true,
      staffed: true,
      extraDistance: '+450 m',
      extraMinutes: 3,
    },
    {
      id: 'khue-my',
      name: 'Điểm tái chế Khuê Mỹ',
      cardName: 'Điểm tái chế Khuê Mỹ',
      address: '60 Hồ Xuân Hương, Ngũ Hành Sơn, Đà Nẵng',
      distance: 1.1,
      minutes: 10,
      materials: ['Nhựa', 'Giấy, bìa', 'Thủy tinh'],
      hours: 'Mở đến 18:00',
      open: true,
      available: true,
      staffed: true,
      extraDistance: '+900 m',
      extraMinutes: 5,
    },
  ];
export const findCollectionPoint = (id?: string) =>
  [...designPoints, ...replacementPoints].find((point) => point.id === id);
export function matchingCollectionPoints(filters: CollectionFilters, search = '') {
  return designPoints.filter(
    (point) =>
      (!filters.materials.length ||
        filters.materials.some((material) => point.materials.includes(material))) &&
      point.distance <= filters.radius &&
      (filters.hours !== 'open' || point.open) &&
      (filters.hours !== 'always' || point.always) &&
      (!filters.available || point.available) &&
      (!filters.staffed || point.staffed) &&
      foldCollection(
        `${point.name} ${point.cardName} ${point.address} ${point.materials.join(' ')}`,
      ).includes(foldCollection(search)),
  );
}
