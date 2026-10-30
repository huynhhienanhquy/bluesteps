const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const evidence = path.join(root, 'docs/figma-fidelity');
const read = (name) => JSON.parse(fs.readFileSync(path.join(evidence, name), 'utf8'));
const maps = read('handbook-types-context-asset-map.json');
const assetFiles = read('handbook-types-asset-map.json');
const typography = read('handbook-types-typography.json');
const colors = (paints) => {
  const paint = paints?.find((p) => p.type === 'SOLID' && p.visible !== false);
  if (!paint) return 'transparent';
  const c = paint.color;
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${paint.opacity ?? 1})`;
};
const result = {};
for (const [kind, key] of [
  ['plastic', '386-16931'],
  ['medical', '386-17005'],
  ['bag', '386-17077'],
  ['battery', '386-17145'],
]) {
  const frame = read(`handbook-types-${key}-geometry.json`);
  const byId = Object.fromEntries(frame.nodes.map((node) => [node.id, node]));
  const imageMap = { ...maps[frame.id] };
  for (const node of frame.nodes) {
    if (node.type === 'INSTANCE' && ['Group', 'Group 36703'].includes(node.name))
      imageMap[node.id] = node.name === 'Group' ? 'imgGroup' : 'imgGroup36703';
    if (node.name === 'Rectangle 10' && node.fills?.some((f) => f.type === 'IMAGE'))
      imageMap[node.id] = 'imgRectangle10';
    if (node.name === 'download (4) 1' && node.fills?.some((f) => f.type === 'IMAGE'))
      imageMap[node.id] = 'imgDownload41';
  }
  const layers = [];
  for (const node of frame.nodes) {
    if (node.id === frame.id) continue;
    let parent = node.parent;
    let exportedParent = false;
    while (parent && parent !== frame.id) {
      if (imageMap[parent]) {
        exportedParent = true;
        break;
      }
      parent = byId[parent]?.parent;
    }
    if (exportedParent) continue;
    const source = imageMap[node.id];
    if (source) {
      const file = assetFiles[frame.id][source];
      if (!file) throw new Error(`Missing original asset ${frame.id}/${source}`);
      layers.push({
        kind: 'image',
        id: node.id,
        source,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        render: node.render,
        rotation: -(node.rotation ?? 0),
        opacity: node.opacity,
        crop:
          node.fills?.find((f) => f.type === 'IMAGE' && f.scaleMode === 'CROP')?.imageTransform ??
          null,
        fit: node.fills?.some((f) => f.type === 'IMAGE' && f.scaleMode === 'FILL')
          ? 'cover'
          : 'fill',
        radius: typeof node.radius === 'number' ? node.radius : 0,
        svg: file.endsWith('.svg'),
      });
    } else if (node.type === 'TEXT' && node.text) {
      const styles = typography[frame.id].find((text) => text.id === node.id);
      layers.push({
        kind: 'text',
        id: node.id,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        text: node.text,
        color: colors(node.fills),
        align: node.align,
        runs: styles.runs,
        bullets: node.id === '386:17064',
        autoWidth: styles.textAutoResize === 'WIDTH_AND_HEIGHT',
        heading: node.y === 57,
      });
    } else if (
      ['RECTANGLE', 'ELLIPSE', 'FRAME'].includes(node.type) &&
      node.fills?.some((f) => f.type === 'SOLID' && f.visible !== false)
    ) {
      const ownEffects =
        node.effects?.filter((e) => e.visible !== false && e.type === 'DROP_SHADOW') ?? [];
      const parentEffects =
        byId[node.parent]?.effects?.filter(
          (e) => e.visible !== false && e.type === 'DROP_SHADOW',
        ) ?? [];
      const buttonEffects =
        byId[byId[node.parent]?.parent]?.effects?.filter(
          (e) => e.visible !== false && e.type === 'DROP_SHADOW',
        ) ?? [];
      layers.push({
        kind: 'shape',
        id: node.id,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        color: colors(node.fills),
        border: colors(node.strokes),
        stroke: node.strokes?.length ? node.stroke : 0,
        corners:
          node.type === 'ELLIPSE'
            ? [node.w / 2, node.w / 2, node.w / 2, node.w / 2]
            : (node.corners ?? [0, 0, 0, 0]),
        effects: ownEffects.length
          ? ownEffects
          : [...parentEffects, ...(node.y === 946 ? buttonEffects : [])],
      });
    }
  }
  const heading = layers.find((layer) => layer.kind === 'text' && layer.heading)?.text.trim();
  const button = frame.nodes.find((node) => node.type === 'INSTANCE' && node.name === 'button');
  const cta = layers.find((layer) => layer.kind === 'text' && layer.y === 962)?.text;
  result[kind] = {
    id: frame.id,
    height: frame.height,
    heading,
    cta,
    button: button
      ? { x: button.x, y: button.y, w: button.w, h: button.h }
      : { x: 108, y: 946, w: 220, h: 50 },
    layers,
  };
}
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/features/handbook/handbook-types-data.ts'),
  'export const handbookTypesData = ' + JSON.stringify(result, null, 2) + ' as const;\n',
);
console.log(
  Object.fromEntries(
    Object.entries(result).map(([key, value]) => [
      key,
      { layers: value.layers.length, heading: value.heading },
    ]),
  ),
);
