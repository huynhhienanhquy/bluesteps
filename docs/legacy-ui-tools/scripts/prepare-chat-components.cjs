const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
const config = require('./chat-design-config.cjs');
const definitions = [
  ['Iconly/Regular/Outline/Call', 'I386:8159;37694:3903'],
  ['Iconly/Regular/Outline/Video', 'I386:8160;33437:4469'],
  ['Iconly/Regular/Light/Voice', 'I386:8175;29221:1552'],
  ['Iconly/Regular/Light/Image 3', 'I386:8176;29221:1653'],
  ['Iconly/Regular/Light/Document', 'I386:8177;29221:1872'],
  ['Iconly/Regular/Light/Plus', 'I386:8178;29221:1824'],
  ['Iconly/Regular/Light/Download', 'I386:8220;29221:1724'],
  ['Iconly/Regular/Bulk/Camera', 'I386:8173;29221:1260'],
  ['chevron_backward', 'I386:8158;54616:25486'],
  ['close', 'I386:17293;54616:25406'],
];
const assets = {},
  layouts = {};
const normalize = (name) => name.replace(/[^a-zA-Z0-9]/g, '');
for (const [name, id] of definitions) {
  const contextId = name === 'Iconly/Regular/Bulk/Camera' ? '386:8173' : id;
  const code = fs.readFileSync(
    path.join(
      dir,
      `contexts/${contextId.replaceAll(':', '-').replaceAll(';', '_')}-chat-component.txt`,
    ),
    'utf8',
  );
  const url = code.match(/const \w+ = "(https:[^"]+)"/)?.[1];
  if (!url) throw Error('Missing SVG for ' + name);
  const key = 'chat' + normalize(name);
  assets[key] = { url, file: `assets/figma/chat/common/${key}.svg` };
}
for (const frame of config.frames) {
  const geo = JSON.parse(
    fs.readFileSync(
      path.join(dir, `contexts/${frame.replace(':', '-')}-chat-geometry.json`),
      'utf8',
    ),
  );
  const replacements = {},
    skipNodes = [];
  for (const node of geo.nodes.filter((n) => n.type === 'INSTANCE')) {
    if (node.name.includes('/Heart') && !geo.nodes.some((c) => c.parent === node.id)) {
      skipNodes.push(node.id);
      continue;
    }
    const definition = definitions.find(([name]) => name === node.name);
    if (!definition) continue;
    const [name, canonical] = definition;
    const contextId = name === 'Iconly/Regular/Bulk/Camera' ? '386:8173' : canonical;
    const child = geo.nodes.find((n) => n.parent === node.id);
    if (!child) throw Error('Missing exact helper geometry ' + node.id);
    const key = 'chat' + normalize(name);
    const code = fs.readFileSync(
      path.join(
        dir,
        `contexts/${contextId.replaceAll(':', '-').replaceAll(';', '_')}-chat-component.txt`,
      ),
      'utf8',
    );
    const inset =
      name === 'Iconly/Regular/Bulk/Camera' ? undefined : code.match(/inset-\[([^\]]+)\]/)?.[1];
    const values = inset ? inset.split('_').map((v) => parseFloat(v) / 100) : [0];
    const [top, right = top, bottom = top, left = right] = values;
    const layer = {
      kind: 'image',
      id: child.id,
      key,
      x: child.x + child.w * left,
      y: child.y + child.h * top,
      w: child.w * (1 - left - right),
      h: child.h * (1 - top - bottom),
      opacity: 1,
      radius: 0,
      fit: 'fill',
    };
    replacements[node.id] = [layer];
    replacements[normalize(name)] = [layer];
  }
  layouts[frame] = { replacements, skipNodes };
}
fs.writeFileSync(
  path.join(dir, 'chat-component-assets.json'),
  JSON.stringify(assets, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(dir, 'chat-component-layout.json'),
  JSON.stringify(layouts, null, 2) + '\n',
);
console.log(JSON.stringify({ frames: config.frames.length, assets: Object.keys(assets).length }));
