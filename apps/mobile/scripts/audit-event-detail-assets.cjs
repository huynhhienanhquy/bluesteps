const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'apps/mobile');
const checkedFiles = new Set();
function load(relative) {
  const filename = path.join(mobile, relative);
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require(name) {
        const file = path.resolve(path.dirname(filename), name);
        assert(file.startsWith(path.join(mobile, 'assets') + path.sep));
        assert(fs.statSync(file).size > 0, `Empty original asset: ${file}`);
        checkedFiles.add(file);
        return file;
      },
    },
  );
  return exports;
}
const { eventDetailDesignData: data } = load('src/features/events/event-detail-design-data.ts');
const { eventDetailAssets: assets } = load('src/design-system/event-detail-assets.ts');
const original = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/figma-fidelity/event-detail-layout-source.json'), 'utf8'),
);
const rows = [];
for (const [frame, design] of Object.entries(data)) {
  assert.equal(JSON.stringify(design), JSON.stringify(original[frame]), `Layout drift: ${frame}`);
  assert(
    design.title && design.area && design.intro && design.introTitle,
    `Incomplete copy: ${frame}`,
  );
  assert.equal(design.related.texts.filter((text) => text.size === 10).length, 3);
  const images = [
    ...design.background,
    ...design.hero,
    ...design.people.images,
    ...design.stats.images,
    ...design.related.images,
    design.location,
  ].filter(Boolean);
  for (const image of images) {
    assert(assets[frame][image.key], `Unwired image: ${frame}/${image.key}`);
    assert(image.w > 0 && image.h > 0 && Number.isFinite(image.x) && Number.isFinite(image.y));
  }
  for (const key of design.nav) assert(assets[frame][key], `Unwired navigation: ${frame}/${key}`);
  rows.push({
    frame,
    eventId: design.eventId,
    interested: design.interested,
    imageSlots: images.length,
    originalGeometry: `contexts/${frame.replace(':', '-')}-geometry.json`,
  });
}
for (const file of [
  'event-back.svg',
  'event-saved-back.svg',
  'event-collection-plus.svg',
  'event-removed-gradient.svg',
]) {
  const target = path.join(mobile, 'assets/figma/common', file);
  assert(fs.statSync(target).size > 0);
  checkedFiles.add(target);
}
const derivatives = JSON.parse(
  fs.readFileSync(
    path.join(root, 'docs/figma-fidelity/event-detail-native-derivatives.json'),
    'utf8',
  ),
);
for (const item of derivatives.derivatives) {
  for (const [file, expected] of [
    [item.original, item.originalSha256],
    [item.output, item.outputSha256],
  ])
    assert.equal(
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, file)))
        .digest('hex'),
      expected,
      `Derivative provenance: ${file}`,
    );
  assert.equal(assets[item.frame][item.key], path.join(root, item.output));
}
const screen = fs.readFileSync(
  path.join(mobile, 'src/features/events/EventDetailDesignScreen.tsx'),
  'utf8',
);
const saved = fs.readFileSync(
  path.join(mobile, 'src/features/events/SavedEventScreens.tsx'),
  'utf8',
);
const route = fs.readFileSync(path.join(mobile, 'src/features/events/EventScreens.tsx'), 'utf8');
assert(screen.includes('source={assets[p.key]!}') && route.includes('<EventDetailDesignScreen'));
assert(saved.includes("eventDetailAssets['386:18069']") && saved.includes('<EventSavedFeedback'));
const report = {
  checkedAt: new Date().toISOString(),
  passed: true,
  frames: rows,
  savedFrame: '386:18069',
  feedbackFrames: ['386:10122', '386:10131'],
  checkedFiles: checkedFiles.size,
  nativeDerivatives: derivatives.derivatives.length,
  scope:
    'Local source wiring, nonempty original assets, measured metadata and derivative SHA-256 provenance. Native visual and interaction QA are reported separately; this does not accept full-frame fidelity.',
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/event-detail-asset-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    passed: true,
    detailVariants: rows.length,
    checkedFiles: checkedFiles.size,
    nativeDerivatives: derivatives.derivatives.length,
  }),
);
