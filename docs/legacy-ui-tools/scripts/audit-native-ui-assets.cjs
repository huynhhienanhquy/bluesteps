const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'apps/mobile');
const files = new Set();
function load(relative) {
  const filename = path.join(mobile, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      const file = path.resolve(path.dirname(filename), name);
      if (!file.startsWith(path.join(mobile, 'assets') + path.sep))
        throw Error(`Unexpected asset path: ${name}`);
      if (!fs.statSync(file).size) throw Error(`Empty asset: ${file}`);
      files.add(file);
      return path.relative(root, file).replaceAll('\\', '/');
    },
  });
  return exports;
}
const { newsDetailDesignData: data } = load('src/features/content/news-detail-design-data.ts');
const { newsDetailAssets: assets } = load('src/design-system/news-detail-assets.ts');
const { eventDesignAssets } = load('src/design-system/event-design-assets.ts');
const layout = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/figma-fidelity/news-detail-layout-source.json'), 'utf8'),
);
const articleSource = fs.readFileSync(
  path.join(mobile, 'src/features/content/NewsArticleScreen.tsx'),
  'utf8',
);
const routeSource = fs.readFileSync(
  path.join(mobile, 'src/features/content/NewsScreens.tsx'),
  'utf8',
);
if (
  !articleSource.includes('source={assets[data.hero]}') ||
  !articleSource.includes('source={assets[picture.key]!}') ||
  !routeSource.includes('<NewsArticleScreen')
)
  throw Error('Article assets are not wired into the native route');
const rows = Object.entries(data).map(([frame, article]) => {
  if (JSON.stringify(article) !== JSON.stringify(layout[frame]))
    throw Error(`Design data drift: ${frame}`);
  for (const key of [
    article.hero,
    'clock',
    'imgRectangle87',
    'imgGroup',
    'imgGroup1',
    'imgGroup2',
    'imgGroup37108',
    'imgGroup36731',
    ...(article.back ? ['back'] : []),
  ])
    if (!assets[frame][key]) throw Error(`Missing ${frame}/${key}`);
  if (
    !article.back &&
    (!assets['386:17608'].back || !articleSource.includes("newsDetailAssets['386:17608'].back"))
  )
    throw Error(`Missing native back affordance for ${frame}`);
  const images = article.sections.flatMap((section) => section.images);
  for (const image of images) {
    if (!assets[frame][image.key]) throw Error(`Missing content asset: ${frame}/${image.key}`);
    if (image.w <= 0 || image.h <= 0 || image.x < 0 || image.x + image.w > 428.1)
      throw Error(`Invalid image bounds: ${image.id}`);
  }
  return {
    frame,
    articleId: article.articleId,
    sections: article.sections.length,
    bodyPictures: images.length,
    assets: Object.keys(assets[frame]).length,
    back: article.back ? 'frame-asset' : 'shared-native-back-for-prototype-hit-area',
  };
});
const eventFrame = eventDesignAssets['534:49034'];
const eventSource = fs.readFileSync(
  path.join(mobile, 'src/features/events/EventExploreScreen.tsx'),
  'utf8',
);
const eventKeys = [
  'imgRectangle737',
  'imgRectangle738',
  'imgImage26',
  'imgSearch',
  'imgCheck',
  'imgTrash2',
  'imgSprout',
  'imgRecycle',
  'imgEllipse67',
  'imgCalendarDays',
  'imgArrowRight',
];
for (const key of eventKeys)
  if (!eventFrame[key] || !eventSource.includes(`a.${key}`))
    throw Error(`Explore asset not wired: ${key}`);
const result = {
  checkedOn: '2026-10-31',
  scope:
    'Local asset existence, saved geometry/data consistency and native source wiring; not rendered geometry or visual acceptance',
  articles: rows,
  eventExplore: { frame: '534:49034', verifiedDirectAssetKeys: eventKeys },
  nonEmptyLocalFiles: files.size,
  nativeVisualQA: 'pending-device',
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/native-ui-asset-audit.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
