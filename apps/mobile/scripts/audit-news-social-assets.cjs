const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const captures = read('docs/figma-fidelity/rendered/capture-report-news-.json');
const map = read('docs/figma-fidelity/news-design-asset-map.json');
const baseline = read('docs/figma-fidelity/news-feed-asset-audit.json');
// Reuse the independent expected chrome geometry, not measured coordinates.
// Both new cached contexts have the same 16px status inset and y=810 navigation.
const chromeKeys = new Set([
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
const chrome = baseline.rows
  .filter((row) => row.frame === '609:5165' && chromeKeys.has(row.key))
  .map((row) => [row.key, ...row.expected, 1]);
if (chrome.length !== 13) throw new Error('Incomplete source-derived chrome expectations');
const frames = [
  {
    id: '609:5361',
    route: '/articles/discussion?id=daily-waste&preview=1',
    assets: [...chrome, ['imgFrame', 36, 144, 356, 154, 1]],
  },
  {
    id: '612:5286',
    route: '/articles/topics?preview=1',
    assets: [
      ...chrome,
      ['imgFrame', 184, 180, 220, 200, 0.48],
      ['imgBiuTng', 40, 462, 46, 46, 1],
      ['imgBiuTng', 236, 462, 46, 46, 1],
      ['imgBiuTng', 40, 628, 46, 46, 1],
      ['imgBiuTng', 236, 628, 46, 46, 1],
    ],
  },
];
const rows = [];
for (const frame of frames) {
  const capture = captures.results.find(
    (item) => item.path === frame.route && item.viewport === '428x926',
  );
  if (!capture || capture.images.length !== frame.assets.length)
    throw new Error(`Missing or unaccounted images in ${frame.id}`);
  const counts = {};
  for (const [key, x, y, width, height, opacity] of frame.assets) {
    const occurrence = counts[key] || 0;
    counts[key] = occurrence + 1;
    const image = capture.images.filter((item) => item.src.startsWith(`${key}.`))[occurrence];
    const file = path.resolve(root, 'apps/mobile/src/design-system', map[frame.id][key]);
    const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
    const md5 = nonempty ? createHash('md5').update(fs.readFileSync(file)).digest('hex') : null;
    const exactLocalSource = Boolean(md5 && image?.src.includes(`.${md5}.`));
    const expected = [x, y, width, height];
    const actual = image ? [image.x, image.y, image.width, image.height] : null;
    const maximumDifference = actual
      ? Math.max(...actual.map((value, field) => Math.abs(value - expected[field])))
      : null;
    const opacityMatches = image && Math.abs(image.opacity - opacity) < 0.001;
    const fitMatches = key !== 'imgFrame' || image?.fit === 'cover';
    rows.push({
      frame: frame.id,
      key,
      occurrence,
      source: path.relative(root, file).replaceAll('\\', '/'),
      callsite: chromeKeys.has(key)
        ? 'apps/mobile/src/features/content/NewsDesignParts.tsx'
        : frame.id === '609:5361'
          ? 'apps/mobile/src/features/content/NewsDiscussionView.tsx'
          : 'apps/mobile/src/features/content/NewsTopicsScreen.tsx',
      expected,
      actual,
      maximumDifference,
      expectedOpacity: opacity,
      actualOpacity: image?.opacity,
      opacityMatches,
      fit: image?.fit,
      fitMatches,
      md5,
      exactLocalSource,
      nonempty,
      loaded: image?.loaded ?? false,
      passed:
        nonempty &&
        exactLocalSource &&
        image?.loaded &&
        opacityMatches &&
        fitMatches &&
        maximumDifference <= 0.1,
    });
  }
}
const result = {
  source:
    'New image/circle slots derived from cached high-fidelity JSX for 609:5361 and 612:5286; identical chrome expectations reused from the prior source-derived news audit. Effective opacity and cover fit are measured through DOM ancestors. No fresh Figma geometry read or full-frame fidelity claim.',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/news-social-asset-audit.json'),
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
