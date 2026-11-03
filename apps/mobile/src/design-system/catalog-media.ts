// Bundled illustrations for the explicitly published sample catalog. Keys come from API data.
export const catalogMedia: Record<string, number> = {
  'sample-event-1': require('../../assets/images/catalog/sample-event-1.png'),
  'sample-event-2': require('../../assets/images/news/hero-banner.png'),
  'sample-event-3': require('../../assets/images/catalog/sample-event-1.png'),
  'sample-article-1': require('../../assets/images/news/hero-banner.png'),
  'sample-article-2': require('../../assets/images/catalog/sample-article-2.png'),
  'sample-article-3': require('../../assets/images/catalog/sample-article-3.png'),
  'sample-point-1': require('../../assets/images/news/hero-banner.png'),
  'sample-point-2': require('../../assets/images/catalog/sample-event-1.png'),
  'sample-point-3': require('../../assets/images/news/hero-banner.png'),
  'sample-reward-1': require('../../assets/images/rewards/catalog/sample-reward-1.png'),
  'sample-reward-2': require('../../assets/images/rewards/catalog/sample-reward-2.png'),
  'sample-reward-3': require('../../assets/images/rewards/catalog/sample-reward-3.png'),
  'display-reward-voucher-supermarket': require('../../assets/images/rewards/vouchers/voucher-supermarket.png'),
  'display-reward-voucher-discount': require('../../assets/images/rewards/vouchers/voucher-discount.png'),
  'display-reward-voucher-workshop': require('../../assets/images/rewards/vouchers/workshop-voucher.png'),
  'display-reward-entertainment-cinema': require('../../assets/images/rewards/entertainment/entertainment-cinema.png'),
  'display-reward-entertainment-recycling-tour': require('../../assets/images/rewards/entertainment/entertainment-recycling-tour.png'),
  'display-reward-entertainment-craft': require('../../assets/images/rewards/vouchers/workshop-voucher.png'),
  'display-reward-other-glass-bottle': require('../../assets/images/rewards/other/other-glass-bottle.png'),
  'display-reward-other-photo-frame': require('../../assets/images/rewards/other/other-photo-frame.png'),
  'display-reward-other-document-box': require('../../assets/images/rewards/other/other-document-box.png'),
};

export function hasCatalogMedia(key: string): boolean {
  return Object.hasOwn(catalogMedia, key);
}
