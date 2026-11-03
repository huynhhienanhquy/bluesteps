const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'docs/figma-fidelity');
const mobile = path.join(root, 'apps/mobile');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const frames = [
  '11010',
  '11320',
  '11451',
  '11652',
  '11858',
  '12064',
  '12071',
  '12194',
  '12284',
  '12362',
  '12517',
  '12671',
  '12823',
  '12956',
  '13109',
  '16253',
  '16592',
];
const downloads = [];
const data = {};
const assets = {};
function enqueue(url, file) {
  const target = path.join(mobile, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  downloads.push({ url, target });
  return '../../' + file.replaceAll('\\', '/');
}
const extra = read('rewards-downloads.json');
const iconDownloads = read('rewards-icon-downloads.json');
const transforms = read('rewards-transforms.json');
const icons = {
  forward: enqueue(iconDownloads.forward, 'assets/figma/rewards/forward.svg'),
  back: enqueue(iconDownloads.back, 'assets/figma/rewards/back.svg'),
};
for (const suffix of frames) {
  const id = '386:' + suffix;
  const key = '386-' + suffix;
  const geo = read(`contexts/${key}-rewards-geometry.json`);
  const nodes = new Map(geo.nodes.map((n) => [n.id, n]));
  const source = fs
    .readFileSync(path.join(dir, `contexts/${key}-rewards.txt`), 'utf8')
    .split('SUPER CRITICAL:')[0];
  const ast = ts.createSourceFile(
    'source.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const sources = Object.fromEntries(
    [...source.matchAll(/const (\w+) = "(https:[^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  assets[id] = { ...icons };
  for (const [name, url] of Object.entries(sources)) {
    assets[id][name] = enqueue(
      url,
      `assets/figma/rewards/${key}/${name}.${url.endsWith('.svg') ? 'svg' : 'png'}`,
    );
  }
  downloads.push({ url: extra.refs[id], target: path.join(dir, `reference/${key}-rewards.png`) });
  const layers = [];
  const elements = [];
  const boxOf = (n) => ({ x: n.x, y: n.y, w: n.w, h: n.h });
  function attrs(node) {
    const open = ts.isJsxElement(node) ? node.openingElement : node;
    const a = { tag: open.tagName.getText(ast) };
    for (const p of open.attributes.properties)
      if (ts.isJsxAttribute(p)) {
        const v = p.initializer;
        a[p.name.getText(ast)] =
          v && ts.isStringLiteral(v)
            ? v.text
            : v && ts.isJsxExpression(v)
              ? v.expression?.getText(ast)
              : '';
      }
    return a;
  }
  const px = (v, extent) => (v.endsWith('%') ? (parseFloat(v) * extent) / 100 : parseFloat(v));
  function insetBox(c, b) {
    const m = c.match(/(?:^| )inset-\[([^\]]+)\]/);
    if (!m) return b;
    const vals = m[1].split('_');
    const [t, r = t, bt = t, l = r] = vals;
    return {
      x: b.x + px(l, b.w),
      y: b.y + px(t, b.h),
      w: b.w - px(l, b.w) - px(r, b.w),
      h: b.h - px(t, b.h) - px(bt, b.h),
    };
  }
  function visit(node, parent, owner, inheritedOpacity = 1, radius = 0, ancestors = []) {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
      ts.forEachChild(node, (c) => visit(c, parent, owner, inheritedOpacity, radius, ancestors));
      return;
    }
    const a = attrs(node),
      c = a.className || '';
    const n = nodes.get(a['data-node-id']);
    const opacity = inheritedOpacity * (n?.opacity ?? 1);
    let b = n
      ? boxOf(n)
      : parent
        ? insetBox(c, parent)
        : { x: 0, y: 0, w: geo.width, h: geo.height };
    if (!b) return;
    const rounded = c.match(/rounded-\[([\d.]+)px\]/);
    const rad = rounded ? Number(rounded[1]) : n ? (n.radius ?? 0) : radius;
    if (n)
      elements.push({
        id: n.id,
        tag: a.tag,
        ...b,
        text: n.text || '',
        name: n.name || a['data-name'] || '',
        className: c,
      });
    const navigation = ancestors.some((p) => p.nav) || (/inset-\[87\.47%/.test(c) && b.y > 700);
    a.nav = navigation;
    const status = ancestors.some((p) => p.status) || a['data-name'] === 'iPhone/Status Bar';
    a.status = status;
    if (a.tag === 'img') {
      const ownerClass = elements.find((e) => e.id === owner?.id)?.className ?? '';
      const cornerClass = /rounded-(?:tl|tr|br|bl)/.test(c) ? c : ownerClass;
      const corners = /rounded-(?:tl|tr|br|bl)/.test(cornerClass)
        ? ['tl', 'tr', 'br', 'bl'].map((corner) =>
            Number(
              cornerClass.match(new RegExp('rounded-' + corner + '-\\[([\\d.]+)px\\]'))?.[1] ?? rad,
            ),
          )
        : undefined;
      const tr = transforms[owner?.id];
      if (tr) {
        const dx = b.x - owner.x,
          dy = b.y - owner.y;
        b = { ...b, x: tr.x + tr.m[0] * dx + tr.m[1] * dy, y: tr.y + tr.m[2] * dx + tr.m[3] * dy };
      }
      const percent = (token) => c.match(new RegExp(token + '-\\[(-?[\\d.]+)%\\]'))?.[1];
      const wp = percent('w'),
        hp = percent('h'),
        lp = percent('left'),
        tp = percent('top');
      const crop =
        wp || hp || lp || tp
          ? {
              x: Number(lp || 0) / 100,
              y: Number(tp || 0) / 100,
              w: Number(wp || 100) / 100,
              h: Number(hp || 100) / 100,
            }
          : undefined;
      layers.push({
        kind: 'image',
        id: owner?.id ?? id + '-image-' + layers.length,
        key: a.src,
        ...b,
        opacity,
        radius: rad,
        fit: c.includes('object-cover') ? 'cover' : 'fill',
        navigation,
        status,
        ...(corners ? { corners } : {}),
        ...(tr
          ? {
              rotation: (-Math.atan2(tr.m[2], tr.m[0]) * 180) / Math.PI,
              flipY: tr.m[0] * tr.m[3] - tr.m[1] * tr.m[2] < 0,
            }
          : {}),
        ...(crop ? { crop } : {}),
      });
      return;
    }
    if (a.tag === 'CodeConnectSnippet' && n) {
      const key = n.x < 80 ? 'back' : 'forward';
      const original =
        transforms[key === 'back' ? 'I386:11621;54616:25486' : 'I386:11504;54616:25486'];
      const referenceSize = key === 'back' ? 35 : 25,
        scale = n.w / referenceSize;
      const angle = (-(n.rotation ?? 0) * Math.PI) / 180;
      const dx = original.x * scale,
        dy = original.y * scale;
      layers.push({
        kind: 'image',
        id: n.id,
        key,
        x: b.x + Math.cos(angle) * dx - Math.sin(angle) * dy,
        y: b.y + Math.sin(angle) * dx + Math.cos(angle) * dy,
        w: original.w * scale,
        h: original.h * scale,
        opacity,
        radius: 0,
        fit: 'fill',
        rotation: n.rotation ?? 0,
        navigation,
        status,
      });
      return;
    }
    if (n?.type === 'TEXT') {
      layers.push({
        kind: 'text',
        id: n.id,
        ...b,
        opacity,
        text: n.text,
        align: n.align,
        runs: n.runs,
        stroke: n.stroke,
        strokeWeight: n.strokeWeight,
        nowrap: /whitespace-(?:nowrap|pre)(?: |$)/.test(c) && !/(?:^| )w-\[/.test(c),
        navigation,
        status,
      });
      return;
    }
    // Group/contents are only structural. Their image and text children are emitted separately.
    function ownsImage(el) {
      if (!ts.isJsxElement(el)) return false;
      return el.children.some((child) => {
        if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) return false;
        const ca = attrs(child);
        if (ca.tag === 'img') return true;
        if (ca['data-node-id']) return false;
        return ownsImage(child);
      });
    }
    if (n && !c.includes('contents') && !ownsImage(node) && (n.color || n.gradient || n.stroke)) {
      const layer = {
        kind: 'shape',
        id: n.id,
        ...b,
        opacity,
        color: n.color,
        radius: rad,
        stroke: n.stroke,
        strokeWeight: n.strokeWeight,
        rotation: n.rotation ?? 0,
        effects: n.effects,
        navigation,
        status,
      };
      if (n.type === 'ELLIPSE') layer.radius = Math.max(b.w, b.h) / 2;
      const rgba = c.match(/bg-\[(rgba\([^\)]+\))\]/)?.[1];
      if (rgba) layer.color = rgba;
      if (/rounded-(?:tl|tr|br|bl)/.test(c))
        layer.corners = ['tl', 'tr', 'br', 'bl'].map((corner) =>
          Number(c.match(new RegExp('rounded-' + corner + '-\\[([\\d.]+)px\\]'))?.[1] ?? rad),
        );
      if (n.gradient) {
        const g = n.gradient,
          m = g.gradientTransform;
        const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        const point = (x, y) => [
          ((m[1][1] * (x - m[0][2]) - m[0][1] * (y - m[1][2])) / det) * b.w,
          ((-m[1][0] * (x - m[0][2]) + m[0][0] * (y - m[1][2])) / det) * b.h,
        ];
        const [x1, y1] = point(0, 0.5),
          [x2, y2] = point(1, 0.5);
        const stops = g.gradientStops
          .map(
            (s) =>
              `<stop offset="${s.position}" stop-color="rgb(${[s.color.r, s.color.g, s.color.b].map((v) => Math.round(v * 255)).join(',')})" stop-opacity="${s.color.a ?? 1}"/>`,
          )
          .join('');
        const file = `assets/figma/rewards/${key}/gradient-${layers.length}.svg`;
        fs.mkdirSync(path.dirname(path.join(mobile, file)), { recursive: true });
        fs.writeFileSync(
          path.join(mobile, file),
          `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="0 0 ${b.w} ${b.h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient></defs><rect width="${b.w}" height="${b.h}" rx="${rad}" fill="url(#g)"/></svg>`,
        );
        const name = 'gradient' + layers.length;
        assets[id][name] = '../../' + file;
        layer.key = name;
      }
      layers.push(layer);
    }
    if (ts.isJsxElement(node))
      for (const child of node.children)
        visit(child, b, n || owner, opacity, rad, [...ancestors, a]);
  }
  visit(ast);
  data[id] = { width: geo.width, height: geo.height, layers };
  fs.writeFileSync(
    path.join(dir, `${key}-rewards-elements.json`),
    JSON.stringify(elements, null, 2) + '\n',
  );
}
async function main() {
  let done = 0;
  const queue = downloads.filter(
    ({ target }) => !fs.existsSync(target) || !fs.statSync(target).size,
  );
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const { url, target } = queue.shift();
        await new Promise((resolve, reject) => {
          const p = spawn('curl.exe', ['-f', '-sS', '-L', '--retry', '2', '-o', target, url], {
            windowsHide: true,
          });
          let err = '';
          p.stderr.on('data', (d) => (err += d));
          p.on('error', reject);
          p.on('exit', (code) =>
            code === 0
              ? resolve()
              : reject(Error('Asset download failed: ' + path.basename(target) + ' ' + err)),
          );
        });
        if (++done % 60 === 0) console.log('Downloaded ' + done + ' assets');
      }
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'rewards-asset-map.json'),
    JSON.stringify(assets, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(mobile, 'src/design-system/rewards-assets.ts'),
    '// Original assets from backuped; no remote runtime URLs.\nexport const rewardsAssets = {\n' +
      Object.entries(assets)
        .map(
          ([id, entries]) =>
            `  '${id}': {\n` +
            Object.entries(entries)
              .map(([key, file]) => `    ${key}: require('${file}'),`)
              .join('\n') +
            '\n  },',
        )
        .join('\n') +
      '\n};\n',
  );
  fs.writeFileSync(
    path.join(mobile, 'src/features/rewards/rewards-design-data.json'),
    JSON.stringify(data) + '\n',
  );
  console.log(
    JSON.stringify({
      frames: frames.length,
      downloads: done,
      layers: Object.values(data).reduce((n, f) => n + f.layers.length, 0),
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
