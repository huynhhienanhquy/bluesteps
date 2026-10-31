const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const map = read('docs/figma-fidelity/event-design-asset-map.json');
const capture = read('docs/figma-fidelity/rendered/capture-report-event-saved-.json');
// The high-fidelity contexts provide the flow, gaps, border/padding and nested
// percentage bounds. These are derived expectations, not a fresh Figma geometry read.
const header = [
  ['imgTime', 12, 12, 52, 21],
  ['imgRectangle', 379, 17.333, 22, 11.333],
  ['imgCombinedShape', 402.002, 21, 1.328, 4],
  ['imgRectangle1', 381, 19.333, 18, 7.333],
  ['imgWifi', 358.698, 17.333, 15.272, 10.966],
  ['imgMobileSignal', 336.67, 17.667, 17, 10.666],
  ['imgBack', 31.75, 67.75, 8.5, 14.5],
  ['imgNhDiDin', 372, 59, 32, 32],
];
const percent = (left, top, right, bottom) => [
  left * 4.28,
  top * 1.12,
  (100 - left - right) * 4.28,
  (100 - top - bottom) * 1.12,
];
const grow = ([x, y, w, h], horizontal, vertical) => [
  x - (w * horizontal) / 100,
  y - (h * vertical) / 100,
  w * (1 + (2 * horizontal) / 100),
  h * (1 + (2 * vertical) / 100),
];
const ellipse = percent(41.67, 0, 41.44, 35.34);
const nav = [
  ['imgRectangle87', ...percent(39.86, 42.24, 38.74, 0)],
  ['imgVector', ...percent(85.9, 54.83, 11.58, 35.52)],
  ['imgVector1', ...percent(84.01, 50, 9.68, 25.86)],
  ['imgVector2', ...grow(percent(65.37, 60.86, 28.88, 25.86), 2.94, 4.87)],
  ['imgVector3', ...grow(percent(65.09, 50, 28.6, 26.47), 2.68, 2.75)],
  ['imgVector4', ...grow(percent(29.28, 55.92, 64.41, 23.67), 2.68, 3.17)],
  ['imgVector5', ...grow(percent(29.48, 50, 64.61, 27.62), 2.86, 2.89)],
  ['imgVector6', ...grow([46.2668, 58, 27.0068, 27.0068], 2.78, 2.78)],
  ['imgEllipse9', ellipse[0] - ellipse[2] * 0.0533, 0, ellipse[2] * 1.1066, ellipse[3] * 1.1067],
  ['imgVector7', ...grow(percent(46.85, 19.83, 46.4, 54.31), 3.33, 3.33)],
  ['imgLine1', 155.1928, 103.6496, 135.9328, 2.56],
].map(([key, x, y, w, h]) => [key, x, y + 1041, w, h]);
const frames = [
  {
    id: '534:49845',
    route: '/event-collections',
    height: 1144,
    assets: [
      ...header,
      ['imgHeart', 24, 128, 24, 24],
      ['imgSun', 41, 198, 28, 28],
      ['imgEllipsis', 173, 198, 18, 18],
      ['imgHouse', 237, 198, 28, 28],
      ['imgEllipsis', 369, 198, 18, 18],
      ['imgUsers', 41, 327, 28, 28],
      ['imgEllipsis', 173, 327, 18, 18],
      ['imgPlus', 300, 348, 24, 24],
      ['imgSquareCheck', 41, 530, 22, 22],
      ['imgNhMinhHa', 73, 511, 60, 60],
      ['imgSquareCheck', 41, 600, 22, 22],
      ['imgNhMinhHa1', 73, 581, 60, 60],
      ['imgBell', 41, 730.5, 24, 24],
      ['imgCheck', 39, 857, 14, 14],
      ...nav,
    ],
  },
  {
    id: '534:49968',
    route: '/event-reminders',
    height: 1142,
    assets: [
      ...header,
      ['imgBellRing', 41, 142.5, 30, 30],
      ['imgCongTc', 341, 189, 46, 28],
      ['imgCheck', 44.5, 317, 15, 15],
      ['imgCheck', 44.5, 366, 15, 15],
      ['imgCheck1', 39, 510, 14, 14],
      ['imgCheck1', 199.4, 510, 14, 14],
      ['imgCongTc', 341, 643, 46, 28],
      ['imgCongTc1', 341, 693, 46, 28],
      ['imgCongTc', 341, 737, 46, 28],
      ['imgMoon', 24, 812, 22, 22],
      ['imgChevronRight', 386, 814, 18, 18],
      ['imgInfo', 38, 878, 20, 20],
    ],
  },
];
const callsites = {
  header: 'apps/mobile/src/features/collection/CollectionPage.tsx',
  '534:49845': 'apps/mobile/src/features/events/EventCollectionsScreen.tsx',
  '534:49968': 'apps/mobile/src/features/events/EventRemindersScreen.tsx',
  shared: 'apps/mobile/src/features/events/EventSavedParts.tsx',
  navigation: 'apps/mobile/src/design-system/LegacyNavigation.tsx',
};
const rows = [];
for (const frame of frames) {
  const shot = capture.results.find(
    (item) => item.path.startsWith(frame.route) && item.viewport === `428x${frame.height}`,
  );
  if (!shot) throw new Error(`Missing capture ${frame.id}`);
  const counts = {};
  for (const [key, ...expected] of frame.assets) {
    const occurrence = counts[key] || 0;
    counts[key] = occurrence + 1;
    const actualImage = shot.images.filter((image) => image.src.startsWith(`${key}.`))[occurrence];
    const source = ['imgBack', 'imgPlus'].includes(key)
      ? `../../assets/figma/534-49326/${key}.svg`
      : map[frame.id][key];
    const local = path.resolve(root, 'apps/mobile/src/design-system', source);
    const actual = actualImage
      ? [actualImage.x, actualImage.y, actualImage.width, actualImage.height]
      : null;
    const maxDifference = actual
      ? Math.max(...actual.map((value, i) => Math.abs(value - expected[i])))
      : null;
    const nonempty = fs.existsSync(local) && fs.statSync(local).size > 0;
    const contentHash = nonempty
      ? createHash('md5').update(fs.readFileSync(local)).digest('hex')
      : null;
    const exactLocalSource = Boolean(contentHash && actualImage?.src.includes(`.${contentHash}.`));
    const navAsset = frame.id === '534:49845' && nav.some((item) => item[0] === key);
    const sharedAsset =
      (frame.id === '534:49968' &&
        ['imgCongTc', 'imgCongTc1', 'imgCheck', 'imgCheck1'].includes(key)) ||
      (frame.id === '534:49845' && key === 'imgCheck');
    const owner = header.some((item) => item[0] === key)
      ? callsites.header
      : navAsset
        ? callsites.navigation
        : sharedAsset
          ? callsites.shared
          : callsites[frame.id];
    rows.push({
      frame: frame.id,
      key,
      occurrence,
      source: path.relative(root, local).replaceAll('\\', '/'),
      callsite: owner,
      expected,
      actual,
      maxDifference,
      nonempty,
      contentHash,
      exactLocalSource,
      loaded: actualImage?.loaded ?? false,
      passed: nonempty && exactLocalSource && actualImage?.loaded && maxDifference <= 0.1,
    });
  }
  if (shot.images.length !== frame.assets.length)
    throw new Error(`Unaccounted images in ${frame.id}`);
}
const output = {
  source:
    'Expectations derived from the saved high-fidelity Figma JSX flow and nested percentage bounds; fresh Figma screenshot/geometry access was denied. Text-dependent pill x position uses the cached Inter layout, rounded to 0.1px.',
  scope:
    'Every static image/SVG occurrence in the two 428px preview captures; 390px loading and overflow checked separately. This does not prove full-frame fidelity.',
  limitations: [
    'The Plus Code Connect source package is absent. The original 18px plus from registration node 534:50224 is reused in the 24px slot; exact glyph parity with connected Plus 306:638 is not verified.',
    'Collection flow from cached JSX is 1153px tall in the 1144px viewport and scrolls by 9px. Fresh original screenshot is needed to resolve the discrepancy; no full-frame fidelity claim.',
  ],
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  callsites,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/saved-event-asset-audit.json'),
  JSON.stringify(output, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    { slots: output.slots, failed: output.failed, mismatches: rows.filter((row) => !row.passed) },
    null,
    2,
  ),
);
if (output.failed) process.exitCode = 1;
