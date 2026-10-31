const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'docs/figma-fidelity');
const mobile = path.join(root, 'apps/mobile');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const config = require(path.resolve(process.argv[2]));
const { group, feature, frames, exportName } = config;
if (!/^[a-z][a-z-]*$/.test(group) || !/^[a-z][a-z-]*$/.test(feature))
  throw Error('Invalid design group');
const downloads = [];
const data = {};
const assets = {};
const componentLayout = config.componentLayout ? read(config.componentLayout) : {};
const componentAssets = config.componentAssets ? read(config.componentAssets) : {};
function enqueue(url, file) {
  const target = path.join(mobile, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  downloads.push({ url, target });
  return '../../' + file.replaceAll('\\', '/');
}
const extra = read(`${group}-downloads.json`);
const iconGeometry = read('rewards-transforms.json');
const transforms = {};
const icons = {
  back: '../../assets/figma/rewards/back.svg',
  forward: '../../assets/figma/rewards/forward.svg',
};
for (const suffix of frames) {
  const id = suffix;
  const key = id.replace(':', '-');
  const geo = read(`contexts/${key}-${group}-geometry.json`);
  const nodes = new Map(geo.nodes.map((n) => [n.id, n]));
  for (const n of geo.nodes)
    if (n.matrix) transforms[n.id] = { x: n.originX ?? n.x, y: n.originY ?? n.y, m: n.matrix };
  const navRoots = geo.nodes.filter(
    (n) =>
      (n.type === 'GROUP' || n.type === 'INSTANCE') &&
      n.y >= 800 &&
      n.y < geo.height &&
      n.h > 90 &&
      n.h <= 150 &&
      n.w > 400,
  );
  const navIds = new Set(navRoots.map((n) => n.id));
  const source = fs
    .readFileSync(path.join(dir, `contexts/${key}-${group}.txt`), 'utf8')
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
      `assets/figma/${group}/${key}/${name}.${url.endsWith('.svg') ? 'svg' : 'png'}`,
    );
  }
  for (const [name, replacement] of Object.entries(componentAssets))
    if (config.addComponentAssets || name in assets[id])
      assets[id][name] = enqueue(replacement.url, replacement.file);
  downloads.push({ url: extra.refs[id], target: path.join(dir, `reference/${key}-${group}.png`) });
  const layers = [];
  const elements = [];
  const boxOf = (n) => ({
    x: n.originX ?? n.x,
    y: n.originY ?? n.y,
    w: n.localW ?? n.w,
    h: n.localH ?? n.h,
  });
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
    if (componentLayout[id]?.skipNodes?.includes(n?.id)) return;
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
    const navigation = ancestors.some((p) => p.nav) || navIds.has(n?.id);
    a.nav = navigation;
    const status = ancestors.some((p) => p.status) || a['data-name'] === 'iPhone/Status Bar';
    a.status = status;
    if (config.preserveMasks && a.style?.includes('maskImage')) {
      const key = a.style.match(/\$\{(\w+)\}/)?.[1];
      const position = c
        .match(/mask-position-\[([^\]]+)\]/)?.[1]
        .split('_')
        .map(parseFloat) ?? [0, 0];
      const size = c
        .match(/mask-size-\[([^\]]+)\]/)?.[1]
        .split('_')
        .map(parseFloat) ?? [b.w, b.h];
      if (key) a.mask = { key, x: b.x + position[0], y: b.y + position[1], w: size[0], h: size[1] };
    }
    const mask = [...ancestors, a].reverse().find((p) => p.mask)?.mask;
    const clipAncestors = ancestors.filter((p) => p.clip);
    const clip = clipAncestors.length
      ? clipAncestors.reduce((r, p) => {
          const x = Math.max(r.x, p.clip.x),
            y = Math.max(r.y, p.clip.y);
          return {
            ...p.clip,
            x,
            y,
            w: Math.max(0, Math.min(r.x + r.w, p.clip.x + p.clip.w) - x),
            h: Math.max(0, Math.min(r.y + r.h, p.clip.y + p.clip.h) - y),
          };
        }, clipAncestors[0].clip)
      : undefined;
    if (config.preserveClipping && n?.clipsContent && !n.rotation)
      a.clip = {
        ...b,
        corners: ['tl', 'tr', 'br', 'bl'].map((corner) =>
          Number(c.match(new RegExp('rounded-' + corner + '-\\[([\\d.]+)px\\]'))?.[1] ?? rad),
        ),
      };
    const replacement = componentLayout[id]?.replacements?.[n?.id ?? a.tag];
    if (replacement) {
      layers.push(
        ...replacement.map((l) => ({
          ...l,
          opacity: (l.opacity ?? 1) * opacity,
          navigation,
          status,
          ...(l.clip || clip ? { clip: l.clip ?? clip } : {}),
        })),
      );
      return;
    }
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
        const dx = b.x - (owner.originX ?? owner.x),
          dy = b.y - (owner.originY ?? owner.y);
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
        ...(mask ? { mask } : {}),
        stroke: owner?.type === 'RECTANGLE' ? owner.stroke : undefined,
        strokeWeight: owner?.type === 'RECTANGLE' ? owner.strokeWeight : undefined,
        navigation,
        status,
        ...(clip ? { clip } : {}),
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
        iconGeometry[key === 'back' ? 'I386:11621;54616:25486' : 'I386:11504;54616:25486'];
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
        flipY: n.matrix ? n.matrix[0] * n.matrix[3] - n.matrix[1] * n.matrix[2] < 0 : false,
        navigation,
        status,
        ...(clip ? { clip } : {}),
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
        decoration: /(?:^| )underline(?: |$)/.test(c) ? 'underline' : undefined,
        navigation,
        status,
        ...(clip ? { clip } : {}),
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
        flipY: n.matrix ? n.matrix[0] * n.matrix[3] - n.matrix[1] * n.matrix[2] < 0 : false,
        effects: n.effects,
        navigation,
        status,
        ...(clip ? { clip } : {}),
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
        const file = `assets/figma/${group}/${key}/gradient-${layers.length}.svg`;
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
  let mainElement;
  function findMain(node) {
    if (ts.isJsxElement(node) && attrs(node)['data-node-id'] === id) mainElement = node;
    else ts.forEachChild(node, findMain);
  }
  findMain(ast);
  if (!mainElement) throw Error('Missing JSX root ' + id);
  visit(mainElement);
  for (const picture of componentLayout[id]?.images ?? []) {
    const horizontal =
      picture.key === 'imgDownlaod' ? 0.0405 : picture.key === 'imgImage' ? 0.0406 : 0;
    const vertical =
      picture.key === 'imgDownlaod' ? 0.0442 : picture.key === 'imgImage' ? 0.0407 : 0;
    layers.push({
      ...picture,
      x: picture.x - picture.w * horizontal,
      y: picture.y - picture.h * vertical,
      w: picture.w * (1 + 2 * horizontal),
      h: picture.h * (1 + 2 * vertical),
    });
  }
  data[id] = {
    width: geo.width,
    height: geo.height,
    layers,
    navigationTop: navRoots[0]?.y ?? null,
  };
  fs.writeFileSync(
    path.join(dir, `${key}-${group}-elements.json`),
    JSON.stringify(elements, null, 2) + '\n',
  );
}
async function main() {
  let done = 0;
  const queue = [...new Map(downloads.map((item) => [item.target, item])).values()].filter(
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
    path.join(dir, `${group}-asset-map.json`),
    JSON.stringify(assets, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(mobile, `src/design-system/${group}-assets.ts`),
    `// Original assets from backuped; no remote runtime URLs.\nexport const ${exportName} = {\n` +
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
  fs.mkdirSync(path.join(mobile, 'src/features', feature), { recursive: true });
  fs.writeFileSync(
    path.join(mobile, `src/features/${feature}/${group}-design-data.json`),
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
