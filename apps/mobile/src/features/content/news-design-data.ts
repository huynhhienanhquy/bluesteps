import { newsDesignAssets } from '../../design-system/news-design-assets';
import type { NewsArticle } from '../../services/news';
import { homeAssets } from '../../design-system/figma-assets';
import { newsLandingAssets } from '../../design-system/news-landing-assets';

const a = newsDesignAssets['609:5165'];
const s = newsDesignAssets['609:5266'];
export const designNewsIds = [
  'storm-cleanup',
  'green-sunday',
  'local-cleanup',
  'saigon-cleanup',
  'ha-long',
  'tourism-cleanup',
];
export const designSavedOrder = [
  'green-sunday',
  'saigon-cleanup',
  'ha-long',
  'tourism-cleanup',
  'storm-cleanup',
  'local-cleanup',
];
export const designNewsCovers: Record<string, number> = {
  'youth-ideas': newsLandingAssets['386:9901'].imgRectangle937,
  'storm-cleanup': a.imgRectangle763,
  'green-sunday': a.imgRectangle941,
  'local-cleanup': a.imgRectangle939,
  'saigon-cleanup': a.imgRectangle937,
  'ha-long': s.imgRectangle939,
  'tourism-cleanup': s.imgRectangle941,
};
export function newsCover(article: NewsArticle) {
  if (article.id === 'daily-waste') return homeAssets.imgNhTinTc;
  return (
    designNewsCovers[article.id] ??
    (article.tag === 'Phân loại'
      ? a.imgRectangle939
      : article.tag === 'Cộng đồng'
        ? a.imgRectangle937
        : a.imgRectangle763)
  );
}
export const designTitles: Record<string, string> = {
  'storm-cleanup': 'Người dân tham gia \ndọn rác sau bảo số 13',
  'green-sunday': 'Ca Sỹ Thủy Tiên tham \ngia chủ nhật xanh',
  'ha-long': 'Làm sạch rác thải tại \nVịnh Hạ Long',
  'tourism-cleanup': 'Tham gia làm sạch các\nđiểm thu hút khách du li..',
};
