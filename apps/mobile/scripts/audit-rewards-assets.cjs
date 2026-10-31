const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'docs/figma-fidelity');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const data = JSON.parse(
  fs.readFileSync(
    path.join(root, 'apps/mobile/src/features/rewards/rewards-design-data.json'),
    'utf8',
  ),
);
const map = read('rewards-asset-map.json');
const report = read('rendered/capture-report-rewards-.json');
const targets = require('./fidelity-targets.cjs').filter((t) => t.name.startsWith('rewards-'));
const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
const rows = [];
for (const capture of report.results) {
  const target = targets.find((t) => t.route === capture.path);
  if (!target) throw Error('Unmapped capture');
  const frame = data[target.nodeId],
    s = Number(capture.viewport.split('x')[0]) / 428,
    viewportHeight = Number(capture.viewport.split('x')[1]);
  const fixed = ['386:12362', '386:12517', '386:12671'].includes(target.nodeId);
  const nav = frame.layers.some((l) => l.navigation);
  const images = frame.layers.filter((l) => l.kind === 'image' || l.key);
  const ordered =
    nav && !fixed
      ? [...images.filter((l) => !l.navigation), ...images.filter((l) => l.navigation)]
      : images;
  if (ordered.length !== capture.images.length)
    throw Error(`Image count ${target.nodeId}: ${ordered.length} vs ${capture.images.length}`);
  ordered.forEach((l, index) => {
    let file = path.resolve(root, 'apps/mobile/src/design-system', map[target.nodeId][l.key]);
    if (file.endsWith('.svg') && fs.existsSync(file.replace(/\.svg$/, '.native.png')))
      file = file.replace(/\.svg$/, '.native.png');
    const actual = capture.images[index];
    const crop = l.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const x = crop.x * l.w,
      y = crop.y * l.h,
      w = crop.w * l.w,
      h = crop.h * l.h;
    const a = (-(l.rotation ?? 0) * Math.PI) / 180,
      sy = l.flipY ? -1 : 1;
    const pts = [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h],
    ].map(([px, py]) => [
      l.x + Math.cos(a) * px - Math.sin(a) * py * sy,
      l.y + Math.sin(a) * px + Math.cos(a) * py * sy,
    ]);
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const offset = l.navigation && nav && !fixed ? viewportHeight - 926 * s : 0;
    const expected = [
      Math.min(...xs) * s,
      Math.min(...ys) * s + offset,
      (Math.max(...xs) - Math.min(...xs)) * s,
      (Math.max(...ys) - Math.min(...ys)) * s,
    ];
    const measured = [actual.x, actual.y, actual.width, actual.height];
    const delta = Math.max(...expected.map((v, i) => Math.abs(v - measured[i])));
    const hash = md5(file);
    const asset = actual.src.includes(hash);
    const pass = fs.statSync(file).size > 0 && asset && actual.loaded && delta < 0.15;
    rows.push({
      frame: target.nodeId,
      viewport: capture.viewport,
      node: l.id,
      key: l.key,
      file: path.relative(root, file).replaceAll('\\', '/'),
      asset,
      loaded: actual.loaded,
      expected,
      measured,
      delta,
      pass,
    });
  });
}
const failures = rows.filter((r) => !r.pass);
const result = {
  scope: 'backuped reward frames only',
  captures: report.results.length,
  slots: rows.length,
  failures: failures.length,
  maxDelta: Math.max(...rows.map((r) => r.delta)),
  runtimeErrors: report.errors,
  rows,
};
fs.writeFileSync(
  path.join(dir, 'rewards-asset-audit.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    captures: result.captures,
    slots: result.slots,
    failures: result.failures,
    maxDelta: result.maxDelta,
  }),
);
if (failures.length) {
  console.log(JSON.stringify(failures.slice(0, 8), null, 2));
  process.exitCode = 1;
}
