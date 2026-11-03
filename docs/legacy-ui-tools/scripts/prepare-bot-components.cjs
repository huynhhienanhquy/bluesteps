const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
const config = require('./bot-design-config.cjs');
const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const text = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
const rootFile = path.join(dir, 'contexts/386-9302-bot.txt');
if (
  text('contexts/386-9302-bot.txt').includes('tool call error') ||
  text('contexts/386-9302-bot.txt').startsWith('// Composition:')
) {
  if (text('contexts/386-9302-bot.txt').includes('tool call error'))
    fs.copyFileSync(rootFile, path.join(dir, 'contexts/386-9302-bot-root-error.txt'));
  let code = text('contexts/386-9339-bot.txt').split('SUPER CRITICAL:')[0];
  code = code.replace(/386:(\d+)/g, (m, v) =>
    Number(v) >= 9339 && Number(v) <= 9375 ? '386:' + (Number(v) - 37) : m,
  );
  const end = code.lastIndexOf('</div>');
  if (end < 0) throw Error('Missing common panel JSX');
  code =
    code.slice(0, end) +
    '<a className="absolute bg-[#d9d9d9] rounded-[40px]" data-node-id="386:9155" />\n' +
    code.slice(end);
  fs.writeFileSync(
    rootFile,
    '// Composition: common panel context 386:9339; exact geometry 386:9302; audio 386:9314 and rectangle 386:9155.\n' +
      code,
  );
}
const definitions = [
  ['Mic', 'I386-9120_7758-11906'],
  ['X', 'I386-9122_7758-12632'],
];
const assets = {},
  layouts = {};
const sourceOf = (id) => text(`contexts/${id}-bot-component.txt`);
const asset = (key, id) => {
  const code = sourceOf(id),
    url = code.match(/const \w+ = "(https:[^"]+)"/)?.[1];
  if (!url) throw Error('Missing source asset ' + id);
  assets[key] = { url, file: `assets/figma/bot/common/${key}.svg` };
  return code;
};
for (const [name, id] of definitions) asset('bot' + name, id);
asset('botPhase6Wave', '386-9314');
asset('botPlay', '386-9066');
for (const id of config.frames) {
  const g = read(`contexts/${id.replace(':', '-')}-bot-geometry.json`);
  const replacements = {};
  for (const n of g.nodes.filter((n) => n.type === 'INSTANCE')) {
    const definition = definitions.find(([name]) => name === n.name);
    if (!definition) continue;
    const child = g.nodes.find((c) => c.parent === n.id);
    if (!child) throw Error('Missing icon ' + n.id);
    const code = sourceOf(definition[1]),
      values = code
        .match(/inset-\[([^\]]+)\]/)?.[1]
        .split('_')
        .map((v) => parseFloat(v) / 100) ?? [0];
    const [t, r = t, b = t, l = r] = values;
    replacements[n.id] = [
      {
        kind: 'image',
        id: child.id,
        key: 'bot' + definition[0],
        x: child.x + child.w * l,
        y: child.y + child.h * t,
        w: child.w * (1 - l - r),
        h: child.h * (1 - t - b),
        radius: 0,
        opacity: 1,
        fit: 'fill',
      },
    ];
  }
  if (id === '386:9302') {
    const wave = g.nodes.find((n) => n.id === '386:9314'),
      mask = g.nodes.find((n) => n.id === '386:9313');
    replacements['386:9312'] = [
      {
        kind: 'image',
        id: wave.id,
        key: 'botPhase6Wave',
        x: wave.x,
        y: wave.y,
        w: wave.w * 1.023,
        h: wave.h,
        radius: 0,
        opacity: 1,
        fit: 'fill',
        clip: { x: mask.x, y: mask.y, w: mask.w, h: mask.h },
      },
    ];
  }
  layouts[id] = { replacements };
  if (id === '386:8977') {
    const play = g.nodes.find((n) => n.id === '386:9066');
    const image = {
      kind: 'image',
      id: play.id,
      key: 'botPlay',
      x: play.x,
      y: play.y,
      w: play.w,
      h: play.h,
      radius: 0,
      opacity: 1,
      fit: 'fill',
    };
    replacements[play.id] = [image];
    replacements.Polygon7 = [image];
  }
}
fs.writeFileSync(
  path.join(dir, 'bot-component-assets.json'),
  JSON.stringify(assets, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(dir, 'bot-component-layout.json'),
  JSON.stringify(layouts, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(dir, 'bot-context-composition.json'),
  JSON.stringify(
    {
      frame: '386:9302',
      reason:
        'Whole-frame context repeatedly timed out. Use the common panel code with the exact target geometry and successfully read visible child contexts.',
      commonContext: 'contexts/386-9339-bot.txt',
      targetGeometry: 'contexts/386-9302-bot-geometry.json',
      waveContext: 'contexts/386-9314-bot-component.txt',
      rectangleContext: 'contexts/386-9155-bot-component.txt',
      reference: 'reference/386-9302-bot.png',
      clip: 'Opaque rectangular mask 386:9313 from target geometry',
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ frames: config.frames.length, assets: Object.keys(assets).length }));
