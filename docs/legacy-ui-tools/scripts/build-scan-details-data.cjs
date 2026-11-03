const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const evidence = path.join(root, 'docs/figma-fidelity');
const read = (file) => JSON.parse(fs.readFileSync(path.join(evidence, file), 'utf8'));
const maps = read('scan-details-context-asset-map.json');
const assetFiles = read('scan-details-asset-map.json');
const arrows = read('scan-handbook-chevron-geometry.json');
const color = (paints) => {
  const fill = paints?.find((p) => p.type === 'SOLID' && p.visible !== false);
  if (!fill) return 'transparent';
  const c = fill.color;
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${fill.opacity ?? 1})`;
};
const frames = {},
  extraAssets = {};
for (const [variant, key] of [
  ['loading', '386-14241'],
  ['detail', '386-14346'],
  ['award', '386-14379'],
  ['handbook', '386-14454'],
]) {
  const frame = read(`scan-details-${key}-geometry.json`);
  const byId = Object.fromEntries(frame.nodes.map((n) => [n.id, n]));
  const inheritedShadows = (node) => {
    let parent = byId[node.parent];
    while (parent && parent.id !== frame.id) {
      const effects = (parent.effects ?? []).filter(
        (effect) => effect.type === 'DROP_SHADOW' && effect.visible !== false,
      );
      if (effects.length) return effects;
      parent = byId[parent.parent];
    }
    return [];
  };
  const rootNode = byId[frame.id];
  const scroll = variant === 'handbook' ? byId['386:14457'] : null;
  extraAssets[frame.id] = {};
  const layers = [];
  for (const node of frame.nodes) {
    if (node.id === frame.id) continue;
    let parent = node.parent,
      scrolled = false;
    while (parent && parent !== frame.id) {
      if (parent === scroll?.id) scrolled = true;
      parent = byId[parent]?.parent;
    }
    const x = node.x - (scrolled ? scroll.x : 0),
      y = node.y - (scrolled ? scroll.y : 0);
    const opacity = (node.opacity ?? 1) * (node.ancestorOpacity ?? 1);
    const common = {
      id: node.id,
      parent: node.parent,
      x,
      y,
      w: node.w,
      h: node.h,
      opacity,
      scrolled,
    };
    const vectorFiles = {
      'I386:14452;54616:25406': '../../assets/figma/common/scan-award-close.svg',
      'I386:14516;54616:25486': '../../assets/figma/common/scan-handbook-back.svg',
    };
    const vectorFile = vectorFiles[node.id];
    const source =
      maps[frame.id][node.id] ??
      (vectorFile ? `vector${node.id.replaceAll(':', '_').replaceAll(';', '_')}` : undefined);
    const arrow = variant === 'handbook' ? arrows.find((a) => a.id === node.id) : null;
    const gradient = node.fills?.find((f) => f.type === 'GRADIENT_LINEAR' && f.visible !== false);
    if (source || arrow || gradient) {
      let imageSource = source,
        file,
        box = node.render;
      if (source) file = assetFiles[frame.id][source] ?? vectorFile;
      if (vectorFile) extraAssets[frame.id][source] = vectorFile;
      if (arrow) {
        imageSource = 'imgRowChevron';
        file = '../../assets/figma/386-14454/row-chevron.svg';
        extraAssets[frame.id][imageSource] = file;
        box = arrow.render;
      }
      if (gradient) {
        imageSource = `gradient${node.id.replace(':', '_')}`;
        const m = gradient.gradientTransform,
          det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
        const point = (gx, gy) => ({
          x: (m[1][1] * (gx - m[0][2]) - m[0][1] * (gy - m[1][2])) / det,
          y: (-m[1][0] * (gx - m[0][2]) + m[0][0] * (gy - m[1][2])) / det,
        });
        const a = point(0, 0.5),
          b = point(1, 0.5);
        const stops = gradient.gradientStops
          .map(
            (s) =>
              `<stop offset="${s.position}" stop-color="rgb(${s.color.r * 255},${s.color.g * 255},${s.color.b * 255})" stop-opacity="${s.color.a}"/>`,
          )
          .join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${node.w}" height="${node.h}" viewBox="0 0 ${node.w} ${node.h}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${a.x * node.w}" y1="${a.y * node.h}" x2="${b.x * node.w}" y2="${b.y * node.h}">${stops}</linearGradient></defs><rect width="${node.w}" height="${node.h}" fill="url(#g)"/></svg>`;
        fs.writeFileSync(
          path.join(root, 'apps/mobile/assets/figma', key, `${imageSource}.svg`),
          svg + '\n',
        );
        file = `../../assets/figma/${key}/${imageSource}.svg`;
        extraAssets[frame.id][imageSource] = file;
        box = null;
      }
      const svg = file.endsWith('.svg');
      const imageFill = node.fills?.find((f) => f.type === 'IMAGE');
      const render = box
        ? {
            x: box.x - (scrolled ? scroll.x : 0),
            y: box.y - (scrolled ? scroll.y : 0),
            w: box.w,
            h: box.h,
          }
        : null;
      layers.push({
        ...common,
        kind: 'image',
        source: imageSource,
        svg,
        render,
        ancestorOpacity: node.ancestorOpacity ?? 1,
        rotation: arrow ? arrow.rotation : -(node.rotation ?? 0),
        fit: imageFill?.scaleMode === 'FILL' ? 'cover' : 'fill',
        crop: imageFill?.scaleMode === 'CROP' ? imageFill.imageTransform : null,
        radius: typeof node.radius === 'number' ? node.radius : (node.corners?.[0] ?? 0),
        shadow:
          source === 'imgRectangle219'
            ? inheritedShadows(node)
                .filter((e) => e.type === 'DROP_SHADOW' && e.visible !== false)
                .map(
                  (e) =>
                    `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread}px rgba(${Math.round(e.color.r * 255)},${Math.round(e.color.g * 255)},${Math.round(e.color.b * 255)},${e.color.a})`,
                )
                .join(', ') || undefined
            : undefined,
      });
    } else if (node.type === 'TEXT' && node.text) {
      layers.push({
        ...common,
        kind: 'text',
        text: node.text,
        color: color(node.fills),
        align: node.align,
        autoWidth: node.autoWidth,
        runs: node.runs,
        stroke: node.strokes?.length ? node.stroke : 0,
        border: color(node.strokes),
        heading: ['Loading...', 'Kết quả quét rác', 'CHÚC MỪNG', 'Sổ tay rác'].includes(node.text),
      });
    } else if (
      ['RECTANGLE', 'FRAME', 'INSTANCE', 'ELLIPSE'].includes(node.type) &&
      node.fills?.some((f) => f.type === 'SOLID' && f.visible !== false)
    ) {
      const parentEffects = byId[node.parent]?.effects ?? [];
      const effects = (node.effects?.length ? node.effects : parentEffects).filter(
        (e) => e.visible !== false && e.type === 'DROP_SHADOW',
      );
      layers.push({
        ...common,
        kind: 'shape',
        color: color(node.fills),
        border: color(node.strokes),
        x: x + (node.bbox && node.rotation ? (node.bbox.w - node.w) / 2 : 0),
        y: y + (node.bbox && node.rotation ? (node.bbox.h - node.h) / 2 : 0),
        rotation: -(node.rotation ?? 0),
        stroke: node.strokes?.length ? node.stroke : 0,
        corners:
          node.type === 'ELLIPSE'
            ? [node.w / 2, node.w / 2, node.w / 2, node.w / 2]
            : (node.corners ?? [0, 0, 0, 0]),
        effects,
      });
    }
  }
  frames[variant] = {
    id: frame.id,
    background: color(rootNode.fills),
    height: frame.height,
    layers,
    scroll: scroll ? { x: scroll.x, y: scroll.y, w: scroll.w, h: scroll.h } : null,
  };
}
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/features/scan/scan-details-data.ts'),
  'export const scanDetailsData = ' + JSON.stringify(frames, null, 2) + ' as const;\n',
);
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/design-system/scan-extra-assets.ts'),
  'export const scanExtraAssets = {\n' +
    Object.entries(extraAssets)
      .map(
        ([id, values]) =>
          `  '${id}': {\n` +
          Object.entries(values)
            .map(([key, file]) => `    ${key}: require('${file}'),`)
            .join('\n') +
          '\n  },',
      )
      .join('\n') +
    '\n};\n',
);
console.log(
  Object.fromEntries(Object.entries(frames).map(([key, frame]) => [key, frame.layers.length])),
);
