const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'apps/mobile');
const directory = path.join(root, 'docs/figma-fidelity');
const files = new Set();
const moduleExports = {};
const file = path.join(mobile, 'src/design-system/news-extended-assets.ts');
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  {
    exports: moduleExports,
    require(name) {
      const asset = path.resolve(path.dirname(file), name);
      assert(asset.startsWith(path.join(mobile, 'assets') + path.sep));
      assert(fs.statSync(asset).size > 0);
      files.add(asset);
      return asset;
    },
  },
);
const assets = moduleExports.newsExtendedAssets;
const layouts = JSON.parse(
  fs.readFileSync(path.join(directory, 'news-extended-layout-source.json'), 'utf8'),
);
const derivatives = JSON.parse(
  fs.readFileSync(path.join(directory, 'news-extended-native-derivatives.json'), 'utf8'),
);
const rows = [];
for (const [frame, layout] of Object.entries(layouts)) {
  assert.equal(layout.pageId, '386:7053');
  for (const image of layout.images) {
    assert(assets[frame][image.key], `Unwired original asset: ${frame}/${image.key}`);
    assert(image.w > 0 && image.h > 0 && Number.isFinite(image.x) && Number.isFinite(image.y));
  }
  const callsite =
    frame === '680:5343'
      ? 'NewsSearchScreen.tsx'
      : frame === '680:5406'
        ? 'NewsReadingListScreen.tsx'
        : 'NewsEventScreen.tsx';
  const source = fs.readFileSync(path.join(mobile, 'src/features/content', callsite), 'utf8');
  for (const key of Object.keys(assets[frame]).filter((key) => /^imgNh/.test(key)))
    assert(source.includes(`a.${key}`), `Missing image callsite: ${frame}/${key}`);
  rows.push({
    frame,
    callsite: `apps/mobile/src/features/content/${callsite}`,
    originalImageOccurrences: layout.images.length,
    originalMediaKeys: Object.keys(assets[frame]).filter((key) => /^imgNh/.test(key)),
    navImageOccurrences: layout.navigation.length,
  });
}
for (const item of derivatives.derivatives) {
  for (const [file, hash] of [
    [item.original, item.originalSha256],
    [item.output, item.outputSha256],
  ])
    assert.equal(
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, file)))
        .digest('hex'),
      hash,
    );
  assert.equal(assets[item.frame][item.key], path.join(root, item.output));
}
const navSource = fs.readFileSync(
  path.join(mobile, 'src/features/content/NewsDesignParts.tsx'),
  'utf8',
);
assert(navSource.includes('source={a[key]}') && navSource.includes('testPrefix'));
const report = {
  checkedAt: new Date().toISOString(),
  passed: true,
  pageId: '386:7053',
  rows,
  checkedFiles: files.size,
  derivatives: derivatives.derivatives.length,
  nativeAdaptations: [
    'Native safe areas replace mock status and home bars',
    'Event photo is a 300px source image clipped by 37px of mock status and 34px body overlap',
    'Text and cards flow when enlarged; displayed search count is the actual matching sample count (3), not the static 12 in Figma',
  ],
  scope:
    'Source asset slots, nonempty local files, callsites and derivative hashes. Native geometry is reported by native-news-extended/qa-report.json; full-frame fidelity is not accepted.',
};
fs.writeFileSync(
  path.join(directory, 'news-extended-asset-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    passed: true,
    frames: rows.length + 1,
    checkedFiles: files.size,
    derivatives: derivatives.derivatives.length,
  }),
);
