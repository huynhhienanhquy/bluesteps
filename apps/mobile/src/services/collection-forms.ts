export type CollectionProposalDraft = {
  name: string;
  address: string;
  hours: string;
  materials: string[];
  photos: string[];
  consent: boolean;
  pin: { x: number; y: number } | null;
};
export const initialCollectionProposal = (): CollectionProposalDraft => ({
  name: 'Góc tái chế khu dân cư An Hải',
  address: '32 Nguyễn Duy Hiệu, An Hải, Đà Nẵng',
  hours: 'Thứ Bảy, Chủ nhật • 08:00–17:00',
  materials: ['Nhựa', 'Giấy, bìa', 'Kim loại'],
  photos: [],
  consent: true,
  pin: null,
});
