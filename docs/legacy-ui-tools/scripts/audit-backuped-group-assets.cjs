const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const group = process.argv[2],
  feature = process.argv[3] ?? group;
if (!/^[a-z][a-z-]*$/.test(group ?? '') || !/^[a-z][a-z-]*$/.test(feature))
  throw Error('Invalid group');
const dir = path.join(root, 'docs/figma-fidelity');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const data = read(path.join(root, `apps/mobile/src/features/${feature}/${group}-design-data.json`));
const map = read(path.join(dir, `${group}-asset-map.json`));
const captures = read(path.join(dir, `rendered/capture-report-${group}-.json`));
const targets = require('./fidelity-targets.cjs').filter((t) => t.name.startsWith(group + '-'));
const digest = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
const rows = [];
for (const capture of captures.results) {
  const target = targets.find((t) => t.route === capture.path);
  if (!target) throw Error('Unmapped capture');
  const frame = data[target.nodeId];
  const [width, height] = capture.viewport.split('x').map(Number),
    s = width / frame.width;
  const images = frame.layers.filter((l) => l.kind === 'image' || l.key);
  const ordered = target.fixed
    ? images
    : [...images.filter((l) => !l.navigation), ...images.filter((l) => l.navigation)];
  if (ordered.length !== capture.images.length)
    throw Error(
      `Image count mismatch ${target.nodeId}: ${ordered.length} vs ${capture.images.length}`,
    );
  ordered.forEach((l, index) => {
    let file = path.resolve(root, 'apps/mobile/src/design-system', map[target.nodeId][l.key]);
    if (file.endsWith('.svg') && fs.existsSync(file.replace(/\.svg$/, '.native.png')))
      file = file.replace(/\.svg$/, '.native.png');
    const actual = capture.images[index],
      crop = l.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const x = crop.x * l.w,
      y = crop.y * l.h,
      w = crop.w * l.w,
      h = crop.h * l.h;
    const a = (-(l.rotation ?? 0) * Math.PI) / 180,
      flip = l.flipY ? -1 : 1;
    const corners = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ].map(([px, py]) => [
      l.x + Math.cos(a) * px - Math.sin(a) * py * flip,
      l.y + Math.sin(a) * px + Math.cos(a) * py * flip,
    ]);
    const xs = corners.map((p) => p[0]),
      ys = corners.map((p) => p[1]);
    const offset = l.navigation && !target.fixed ? height - frame.height * s : 0;
    const expected = [
      Math.min(...xs) * s,
      Math.min(...ys) * s + offset,
      (Math.max(...xs) - Math.min(...xs)) * s,
      (Math.max(...ys) - Math.min(...ys)) * s,
    ];
    const measured = [actual.x, actual.y, actual.width, actual.height];
    const delta = Math.max(...expected.map((v, i) => Math.abs(v - measured[i])));
    const asset = actual.src.includes(digest(file));
    const fit = actual.fit === (l.fit === 'cover' ? 'cover' : 'fill');
    const opacity = Math.abs(actual.opacity - l.opacity) < 0.005;
    const pass =
      fs.statSync(file).size > 0 && actual.loaded && asset && fit && opacity && delta < 0.15;
    rows.push({
      frame: target.nodeId,
      node: l.id,
      key: l.key,
      viewport: capture.viewport,
      file: path.relative(root, file).replaceAll('\\', '/'),
      asset,
      fit,
      opacity,
      loaded: actual.loaded,
      expected,
      measured,
      delta,
      pass,
    });
  });
}
const failures = rows.filter((r) => !r.pass),
  maxDelta = Math.max(...rows.map((r) => r.delta));
fs.writeFileSync(
  path.join(dir, `${group}-asset-audit.json`),
  JSON.stringify(
    {
      scope: `backuped ${group} only`,
      captures: captures.results.length,
      slots: rows.length,
      failures: failures.length,
      maxDelta,
      runtimeErrors: captures.errors,
      rows,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    captures: captures.results.length,
    slots: rows.length,
    failures: failures.length,
    maxDelta,
  }),
);
if (failures.length) {
  console.log(JSON.stringify(failures.slice(0, 6), null, 2));
  process.exitCode = 1;
}
