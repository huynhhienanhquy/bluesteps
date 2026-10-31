const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const geometry = read('docs/figma-fidelity/event-form-asset-geometry.json');
const assets = read('docs/figma-fidelity/event-design-asset-map.json');
const captures = read('docs/figma-fidelity/rendered/capture-report-event-.json');
const rows = [];
for (const frame of geometry.frames) {
  const height = frame.frameId === '534:49326' ? 1245 : 1279;
  const route = frame.frameId === '534:49326' ? '/registration' : '/event-summary';
  const capture = captures.results.find(
    (item) => item.path.startsWith(route) && item.viewport === `428x${height}`,
  );
  if (!capture) throw new Error(`Missing capture: ${frame.frameId}`);
  const occurrences = {};
  for (const [key, ...expected] of frame.assets) {
    const occurrence = occurrences[key] || 0;
    occurrences[key] = occurrence + 1;
    const image = capture.images.filter((item) => item.src.startsWith(`${key}.`))[occurrence];
    const source =
      key === 'imgBack' ? '../../assets/figma/534-49326/imgBack.svg' : assets[frame.frameId][key];
    const file = path.resolve(root, 'apps/mobile/src/design-system', source);
    const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
    const actual = image ? [image.x, image.y, image.width, image.height] : null;
    const differences = actual?.map((value, index) => value - expected[index]);
    rows.push({
      frameId: frame.frameId,
      asset: key,
      occurrence,
      source: path.relative(root, file).replaceAll('\\', '/'),
      nonempty,
      loaded: image?.loaded || false,
      expected,
      actual,
      maximumDifference: differences ? Math.max(...differences.map(Math.abs)) : null,
      passed: nonempty && image?.loaded && differences.every((value) => Math.abs(value) <= 0.1),
    });
  }
}
const result = {
  date: '2026-10-30',
  scope:
    'Static asset slots at source 428px width; responsive captures checked separately for loading and overflow',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/event-form-asset-audit.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      slots: result.slots,
      failed: result.failed,
      largestDifference: Math.max(...rows.map((row) => row.maximumDifference || 0)),
    },
    null,
    2,
  ),
);
if (result.failed) process.exitCode = 1;
