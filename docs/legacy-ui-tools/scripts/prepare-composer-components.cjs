const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
const config = require('./composer-design-config.cjs');
const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const fileOf = (id, suffix) =>
  `contexts/${id.replaceAll(':', '-').replaceAll(';', '_')}-composer-${suffix}.txt`;
const context = (id, suffix = 'leaf') =>
  fs.readFileSync(path.join(dir, fileOf(id, suffix)), 'utf8');
const urlOf = (id, suffix) => {
  const source = context(id, suffix);
  const url = source.match(/const \w+ = "(https:[^"]+)"/)?.[1];
  if (!url) throw Error('Missing exact source for ' + id);
  return url;
};
const kb = '386:15148';
const leafIds = [
  '52557:27674',
  '52557:27682',
  '52515:33127',
  '52515:33152',
  '52515:33158',
  '52555:25697;54616:25528',
  '52515:33172;54616:25520',
  '52555:25549;54616:25488',
  '52555:25684;54692:23581',
  '52555:25413;54616:25512',
  '52555:25687;54616:25530',
  '52555:25690;54692:23712',
  '52555:25693;54616:25524',
  '52555:25695;54616:25526',
  '52515:33168',
];
const assets = {};
const addAsset = (key, url) =>
  (assets[key] = { url, file: `assets/figma/composer/common/${key}.svg` });
leafIds.forEach((suffix, i) => addAsset('keyboard' + i, urlOf('I' + kb + ';' + suffix, 'leaf')));
addAsset('composerBack', urlOf('I386:15107;7758:11225', 'component'));
addAsset('composerClose', urlOf('I386:15617;54616:25406', 'component'));
addAsset('composerAdd', urlOf('I386:15149;403:3', 'component'));
addAsset('composerBackward', urlOf('I386:15088;54616:25486', 'component'));
const layouts = {};
const box = (n) => ({
  id: n.id,
  x: n.x,
  y: n.y,
  w: n.w,
  h: n.h,
  radius: n.radius ?? (n.type === 'ELLIPSE' ? Math.max(n.w, n.h) / 2 : 0),
  opacity: n.opacity ?? 1,
});
for (const id of config.frames) {
  const geo = read(`contexts/${id.replace(':', '-')}-composer-geometry.json`);
  const replacements = {};
  for (const n of geo.nodes.filter((n) => n.type === 'INSTANCE')) {
    if (n.name === 'chevron_backward') {
      const icon = geo.nodes.find((c) => c.id.startsWith('I' + n.id + ';') && c.type === 'VECTOR');
      replacements[n.id] = [{ ...box(icon), kind: 'image', key: 'composerBackward', fit: 'fill' }];
    }
    if (n.name === 'Chevron left') {
      const icon = geo.nodes.find((c) => c.id.startsWith('I' + n.id + ';') && c.type === 'VECTOR');
      replacements[n.id] = [
        {
          ...box(icon),
          kind: 'image',
          key: 'composerBack',
          x: icon.x - icon.w * 0.1667,
          y: icon.y - icon.h * 0.0833,
          w: icon.w * 1.3334,
          h: icon.h * 1.1666,
          fit: 'fill',
        },
      ];
    }
    if (n.name === 'close') {
      const icon = geo.nodes.find((c) => c.id.startsWith('I' + n.id + ';') && c.type === 'VECTOR');
      replacements[n.id] = [{ ...box(icon), kind: 'image', key: 'composerClose', fit: 'fill' }];
    }
    if (n.name === 'fi-rr-add') {
      const icon = geo.nodes.find((c) => c.id.startsWith('I' + n.id + ';') && c.type === 'VECTOR');
      replacements.FiRrAdd = [{ ...box(icon), kind: 'image', key: 'composerAdd', fit: 'fill' }];
    }
    if (n.name !== 'Keyboard') continue;
    const all = [n, ...geo.nodes.filter((c) => c.id.startsWith('I' + n.id + ';'))];
    const layers = [];
    for (const c of all) {
      const suffix = c.id.replace('I' + n.id + ';', '');
      const leaf = leafIds.indexOf(suffix);
      const assetAncestor = leafIds.some((s) => suffix.startsWith(s + ';'));
      if (assetAncestor) continue;
      if (leaf >= 0) {
        layers.push({
          ...box(c),
          kind: 'image',
          key: 'keyboard' + leaf,
          fit: 'fill',
          keyboard: true,
        });
        continue;
      }
      if (c.type === 'TEXT')
        layers.push({
          ...box(c),
          kind: 'text',
          text: c.text,
          runs: c.runs,
          align: c.align,
          keyboard: true,
        });
      else if (c.color && !['VECTOR', 'BOOLEAN_OPERATION', 'GROUP', 'INSTANCE'].includes(c.type))
        layers.push({ ...box(c), kind: 'shape', color: c.color, keyboard: true });
      else if (c.id === n.id && c.color)
        layers.push({ ...box(c), kind: 'shape', color: c.color, keyboard: true });
    }
    replacements[n.id] = layers;
  }
  layouts[id] = { replacements };
}
fs.writeFileSync(
  path.join(dir, 'composer-component-assets.json'),
  JSON.stringify(assets, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(dir, 'composer-component-layout.json'),
  JSON.stringify(layouts, null, 2) + '\n',
);
console.log(JSON.stringify({ frames: config.frames.length, assets: Object.keys(assets).length }));
