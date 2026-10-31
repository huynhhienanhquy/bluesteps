const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('../../../node_modules/.pnpm/pngjs@3.4.0/node_modules/pngjs');
const root = path.resolve(__dirname, '../../../docs/figma-fidelity');
const prefix = process.argv[2];
const targets = require('./fidelity-targets.cjs').filter(
  (target) => !prefix || target.name.startsWith(prefix),
);
const output = path.join(root, 'diff');
fs.mkdirSync(output, { recursive: true });
const result = [];
for (const target of targets) {
  const nodeId = target.nodeId.replace(':', '-');
  const screen = target.name;
  const reference = PNG.sync.read(fs.readFileSync(path.join(root, 'reference', `${nodeId}.png`)));
  // Figma screenshots flatten the translucent mask over white. Compare the panel
  // separately; the app correctly shows Settings beneath that same mask.
  const panels = {
    'settings-search': [0, 171, 428, 760, 32],
    'settings-sound': [0, 361, 428, 570, 32],
    'settings-history': [0, 251, 428, 680, 32],
    'settings-pin': [24, 123, 380, 684, 30],
  };
  const panel = target.underlay ? panels[screen] : null;
  const actual = PNG.sync.read(fs.readFileSync(path.join(root, 'rendered', `${screen}-428.png`)));
  if (reference.width !== actual.width || reference.height !== actual.height)
    throw new Error(`Size mismatch: ${screen}`);
  const diff = new PNG({ width: actual.width, height: actual.height });
  let changed = 0,
    totalDifference = 0,
    compared = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    const x = (offset / 4) % actual.width;
    const y = Math.floor(offset / 4 / actual.width);
    if (panel) {
      const [left, top, width, height, radius] = panel;
      const dx = Math.max(left + radius - x, 0, x - (left + width - radius - 1));
      const dy = Math.max(
        top + radius - y,
        0,
        screen === 'settings-pin' ? y - (top + height - radius - 1) : 0,
      );
      if (
        x < left ||
        x >= left + width ||
        y < top ||
        y >= top + height ||
        dx * dx + dy * dy > radius * radius
      ) {
        diff.data.fill(255, offset, offset + 4);
        continue;
      }
    }
    compared++;
    let maximum = 0;
    for (let channel = 0; channel < 3; channel++) {
      const a =
        (actual.data[offset + channel] * actual.data[offset + 3]) / 255 +
        255 -
        actual.data[offset + 3];
      const b =
        (reference.data[offset + channel] * reference.data[offset + 3]) / 255 +
        255 -
        reference.data[offset + 3];
      maximum = Math.max(maximum, Math.abs(a - b));
      totalDifference += Math.abs(a - b);
    }
    if (maximum > 32) changed++;
    diff.data[offset] = maximum > 32 ? 220 : 255;
    diff.data[offset + 1] = maximum > 32 ? 35 : 255;
    diff.data[offset + 2] = maximum > 32 ? 80 : 255;
    diff.data[offset + 3] = 255;
  }
  fs.writeFileSync(path.join(output, `${screen}.png`), PNG.sync.write(diff));
  result.push({
    nodeId: nodeId.replace('-', ':'),
    screen,
    meanAbsoluteChannelDifference: totalDifference / (compared * 3),
    pixelsDifferentOver32: changed,
    totalPixels: actual.width * actual.height,
    comparedPixels: compared,
    comparisonScope: panel
      ? 'Opaque panel only; flattened Figma backdrop excluded.'
      : 'Entire frame.',
    note: 'Exact visual equivalence remains unproven; inspect diff and source geometry.',
  });
}
fs.writeFileSync(
  path.join(output, prefix ? `report-${prefix}.json` : 'report.json'),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
