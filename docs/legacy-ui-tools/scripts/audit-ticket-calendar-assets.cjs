const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const geometry = read('docs/figma-fidelity/ticket-calendar-asset-geometry.json');
const assets = read('docs/figma-fidelity/event-design-asset-map.json');
const captures = read('docs/figma-fidelity/rendered/capture-report-event-.json');
const rows = [];
for (const frame of geometry.frames) {
  const capture = captures.results.find(
    (item) => item.path.startsWith(frame.route) && item.viewport === `428x${frame.height}`,
  );
  if (!capture) throw new Error(`Missing source-size capture: ${frame.frameId}`);
  const occurrences = {};
  for (const [key, ...expected] of frame.assets) {
    const index = occurrences[key] || 0;
    occurrences[key] = index + 1;
    const image = capture.images.filter((item) => item.src.startsWith(`${key}.`))[index];
    const source =
      key === 'imgBack'
        ? '../../assets/figma/534-49326/imgBack.svg'
        : key === 'imgQrPattern'
          ? '../../assets/figma/534-49416/imgQrPattern.png'
          : assets[frame.frameId][key];
    const file = path.resolve(root, 'apps/mobile/src/design-system', source);
    const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
    const actual = image ? [image.x, image.y, image.width, image.height] : null;
    const maximumDifference = actual
      ? Math.max(...actual.map((value, field) => Math.abs(value - expected[field])))
      : null;
    rows.push({
      frameId: frame.frameId,
      asset: key,
      occurrence: index,
      source: path.relative(root, file).replaceAll('\\', '/'),
      nonempty,
      loaded: image?.loaded || false,
      expected,
      actual,
      maximumDifference,
      passed: nonempty && image?.loaded && maximumDifference <= 0.1,
    });
  }
}
const result = {
  date: '2026-10-30',
  coordinateSource: geometry.source,
  scope:
    'Static asset slots at 428 CSS px; responsive views separately checked for loading/overflow',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/ticket-calendar-asset-audit.json'),
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
