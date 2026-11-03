// Bundled illustrations for the explicitly published sample catalog. Keys come from API data.
export const catalogMedia: Record<string, number> = {
  'sample-event-1': require('../../assets/figma/386-10737/imgRectangle968.png'),
  'sample-event-2': require('../../assets/figma/391-24796/imgHeroBanner.png'),
  'sample-event-3': require('../../assets/figma/386-10737/imgRectangle968.png'),
  'sample-article-1': require('../../assets/figma/391-24796/imgHeroBanner.png'),
  'sample-article-2': require('../../assets/figma/386-10737/imgRectangle975.png'),
  'sample-article-3': require('../../assets/figma/386-10737/imgRectangle976.png'),
  'sample-point-1': require('../../assets/figma/391-24796/imgHeroBanner.png'),
  'sample-point-2': require('../../assets/figma/386-10737/imgRectangle968.png'),
  'sample-point-3': require('../../assets/figma/391-24796/imgHeroBanner.png'),
  'sample-reward-1': require('../../assets/figma/rewards/386-11451/imgRectangle30.png'),
  'sample-reward-2': require('../../assets/figma/rewards/386-11451/imgRectangle31.png'),
  'sample-reward-3': require('../../assets/figma/rewards/386-11451/imgRectangle32.png'),
};

export function hasCatalogMedia(key: string): boolean {
  return Object.hasOwn(catalogMedia, key);
}
