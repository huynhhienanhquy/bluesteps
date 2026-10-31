const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const capture = read('docs/figma-fidelity/rendered/capture-report-news-.json');
const map = read('docs/figma-fidelity/news-design-asset-map.json');
const previous = read('docs/figma-fidelity/news-feed-asset-audit.json');
const keys = new Set([
  'imgTime',
  'imgRectangle',
  'imgCombinedShape',
  'imgRectangle1',
  'imgWifi',
  'imgMobileSignal',
  'imgRectangle87',
  'imgGroup',
  'imgGroup1',
  'imgGroup2',
  'imgGroup37108',
  'imgGroup36731',
  'imgLine1',
]);
// The new high-fidelity contexts retain the same percentage-based chrome slots.
const chrome = previous.rows
  .filter((row) => row.frame === '609:5165' && keys.has(row.key))
  .map((row) => [row.key, ...row.expected]);
if (chrome.length !== 13) throw new Error('Missing source-derived chrome expectations');
const frames = [
  { id: '612:5362', route: '/articles/calendar?preview=1', assets: [...chrome] },
  {
    id: '612:5441',
    route: '/articles/briefs?preview=1',
    assets: [
      ...chrome,
      ['imgSTin', 40, 293, 38, 38],
      ['imgSTin1', 40, 450, 38, 38],
      ['imgSTin2', 40, 607, 38, 38],
    ],
  },
];
const rows = [];
for (const frame of frames) {
  const shot = capture.results.find(
    (item) => item.path === frame.route && item.viewport === '428x926',
  );
  if (!shot || shot.images.length !== frame.assets.length)
    throw new Error(`Missing or unaccounted assets in ${frame.id}`);
  for (const [key, ...expected] of frame.assets) {
    const image = shot.images.find((item) => item.src.startsWith(`${key}.`));
    const file = path.resolve(root, 'apps/mobile/src/design-system', map[frame.id][key]);
    const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
    const md5 = nonempty ? createHash('md5').update(fs.readFileSync(file)).digest('hex') : null;
    const exactLocalSource = Boolean(md5 && image?.src.includes(`.${md5}.`));
    const actual = image ? [image.x, image.y, image.width, image.height] : null;
    const maximumDifference = actual
      ? Math.max(...actual.map((value, index) => Math.abs(value - expected[index])))
      : null;
    rows.push({
      frame: frame.id,
      key,
      source: path.relative(root, file).replaceAll('\\', '/'),
      callsite: keys.has(key)
        ? 'apps/mobile/src/features/content/NewsDesignParts.tsx'
        : 'apps/mobile/src/features/content/NewsBriefsScreen.tsx',
      nonempty,
      md5,
      exactLocalSource,
      loaded: image?.loaded ?? false,
      expected,
      actual,
      maximumDifference,
      passed: nonempty && exactLocalSource && image?.loaded && maximumDifference <= 0.1,
    });
  }
}
const result = {
  source:
    'Expected slots derived from fresh high-fidelity Figma contexts 612:5362 and 612:5441; chrome matches cached source expectations, numbered circles at (40,293/450/607), 38px. Static file/slot verification is not a full-frame fidelity acceptance.',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/news-digest-asset-audit.json'),
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
