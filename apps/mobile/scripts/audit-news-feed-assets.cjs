const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const captures = read('docs/figma-fidelity/rendered/capture-report-news-.json');
const map = read('docs/figma-fidelity/news-design-asset-map.json');
const header = [
  ['imgTime', 28, 12, 52, 21],
  ['imgRectangle', 363, 17.333, 22, 11.333],
  ['imgCombinedShape', 386.002, 21, 1.328, 4],
  ['imgRectangle1', 365, 19.333, 18, 7.333],
  ['imgWifi', 342.698, 17.333, 15.272, 10.965],
  ['imgMobileSignal', 320.67, 17.667, 17, 10.666],
];
const rect = (left, top, right, bottom) => [
  left * 4.28,
  top * 1.16,
  (100 - left - right) * 4.28,
  (100 - top - bottom) * 1.16,
];
const grow = ([x, y, w, h], horizontal, vertical) => [
  x - (w * horizontal) / 100,
  y - (h * vertical) / 100,
  w * (1 + (2 * horizontal) / 100),
  h * (1 + (2 * vertical) / 100),
];
const scan = rect(41.36, 0, 41.12, 35.34);
const nav = [
  ['imgRectangle87', ...rect(39.49, 42.24, 38.32, 0)],
  ['imgGroup', ...rect(85.28, 50, 8.18, 25.86)],
  ['imgGroup1', ...grow(rect(65.65, 50, 27.8, 25.86), 2.68, 2.68)],
  ['imgGroup2', ...grow(rect(28.5, 50, 64.95, 23.67), 2.68, 2.46)],
  ['imgGroup37108', 11.984, 51, 87.0124, 47],
  ['imgGroup36731', scan[0] - scan[2] * 0.0533, 0, scan[2] * 1.1066, scan[3] * 1.1067],
  ['imgLine1', 153.01, 107.4428, 140.9832, 2.56],
].map(([key, x, y, w, h]) => [key, x, y + 810, w, h]);
const frames = [
  {
    id: '609:5165',
    route: '/articles?view=search&preview=1',
    cards: [
      ['imgRectangle763', true],
      ['imgRectangle941', false],
      ['imgRectangle939', true],
      ['imgRectangle937', false],
    ],
  },
  {
    id: '609:5266',
    route: '/articles/saved?preview=1',
    cards: [
      ['imgRectangle942', false],
      ['imgRectangle937', false],
      ['imgRectangle939', true],
      ['imgRectangle941', false],
    ],
  },
];
const rows = [];
for (const frame of frames) {
  const capture = captures.results.find(
    (item) => item.path === frame.route && item.viewport === '428x926',
  );
  if (!capture) throw new Error(`Missing capture ${frame.id}`);
  const saved = frame.id === '609:5266';
  const expected = [...header];
  frame.cards.forEach(([photo, leftPhoto], index) => {
    const x = index % 2 ? 206 : 24;
    const y = index < 2 ? 330 : 522;
    expected.push(
      [photo, x + 170 * (leftPhoto ? 0.0529 : 0.0588), y + 174 * 0.0632, 150.008, 90.0102],
      [saved ? 'imgImage42' : 'imgImage37', x + 13.005, y + 146, 14.994, 14.994],
      [saved ? 'imgImage43' : 'imgImage38', x + 131.002, y + 145, 13.005, 13.005],
      [
        saved ? 'imgImage44' : 'imgImage36',
        x + 170 * (leftPhoto ? 0.8471 : 0.8529),
        y + (leftPhoto ? 109 : 106),
        14.994,
        14.994,
      ],
    );
  });
  expected.push(...nav);
  if (expected.length !== capture.images.length)
    throw new Error(`Unaccounted static images in ${frame.id}`);
  const counts = {};
  for (const [key, ...geometry] of expected) {
    const occurrence = counts[key] || 0;
    counts[key] = occurrence + 1;
    const image = capture.images.filter((item) => item.src.startsWith(`${key}.`))[occurrence];
    const file = path.resolve(root, 'apps/mobile/src/design-system', map[frame.id][key]);
    const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
    const md5 = nonempty ? createHash('md5').update(fs.readFileSync(file)).digest('hex') : null;
    const exactLocalSource = Boolean(md5 && image?.src.includes(`.${md5}.`));
    const actual = image ? [image.x, image.y, image.width, image.height] : null;
    const maximumDifference = actual
      ? Math.max(...actual.map((value, field) => Math.abs(value - geometry[field])))
      : null;
    rows.push({
      frame: frame.id,
      key,
      occurrence,
      source: path.relative(root, file).replaceAll('\\', '/'),
      callsite: 'apps/mobile/src/features/content/NewsDesignParts.tsx',
      expected: geometry,
      actual,
      maximumDifference,
      nonempty,
      md5,
      exactLocalSource,
      loaded: image?.loaded ?? false,
      passed: nonempty && exactLocalSource && image?.loaded && maximumDifference <= 0.1,
    });
  }
}
const result = {
  coordinateSource:
    'Expected slots independently derived from the cached high-fidelity Figma JSX: 428x926 root, 16px status-bar inset, 170x174 cards at (24/206,330/522), nested percentage image bounds and original navigation at y=810. No fresh geometry read or full-frame fidelity claim.',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/news-feed-asset-audit.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    { slots: result.slots, failed: result.failed, mismatches: rows.filter((row) => !row.passed) },
    null,
    2,
  ),
);
if (result.failed) process.exitCode = 1;
