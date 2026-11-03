const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
const config = require('./final-design-config.cjs');
const text = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
const read = (file) => JSON.parse(text(file));
const context = (id) => `contexts/${id.replaceAll(':', '-').replaceAll(';', '_')}-final-child.txt`;
function fragment(code, id, prefix) {
  code = code.split('SUPER CRITICAL:')[0];
  const ast = ts.createSourceFile(
    'source.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let element;
  function visit(n) {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      if (
        open.attributes.properties.some(
          (a) =>
            ts.isJsxAttribute(a) &&
            a.name.getText(ast) === 'data-node-id' &&
            a.initializer?.text === id,
        )
      ) {
        element = n;
        return;
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!element) throw Error('Missing exact child JSX ' + id);
  let jsx = element.getText(ast),
    constants = [];
  for (const m of code.matchAll(/const (\w+) = "(https:[^"]+)";/g)) {
    if (!new RegExp('\\b' + m[1] + '\\b').test(jsx)) continue;
    const name = prefix + '_' + m[1];
    jsx = jsx.replace(new RegExp('\\b' + m[1] + '\\b', 'g'), name);
    constants.push(`const ${name} = "${m[2]}";`);
  }
  return { jsx, constants };
}

// The lobby root consistently times out. Compose its successfully read children
// in their original order, using the target's own geometry (including avatars).
const lobbyFile = 'contexts/386-18285-final.txt';
if (text(lobbyFile).includes('tool call error') || text(lobbyFile).startsWith('// Composition:')) {
  if (text(lobbyFile).includes('tool call error'))
    fs.copyFileSync(
      path.join(dir, lobbyFile),
      path.join(dir, 'contexts/386-18285-final-root-error.txt'),
    );
  const g = read('contexts/386-18285-final-geometry.json'),
    pieces = [],
    constants = [];
  const evidence = [];
  for (const n of g.nodes.filter((n) => n.parent === g.id)) {
    if (n.type === 'INSTANCE') {
      pieces.push(`<div data-node-id="${n.id}" />`);
      continue;
    }
    if (n.id === '386:18286') {
      const f = fragment(text('contexts/386-18308-final.txt'), '386:18309', 'status');
      pieces.push(f.jsx.replaceAll('386:18309', '386:18286').replaceAll('386:18310', '386:18287'));
      constants.push(...f.constants);
      evidence.push({
        target: n.id,
        source: 'contexts/386-18308-final.txt',
        common: '386:18309',
        geometry: 'contexts/386-18285-final-geometry.json',
      });
    } else {
      const file = context(n.id),
        f = fragment(text(file), n.id, 'n' + n.id.replace(':', '_'));
      pieces.push(f.jsx);
      constants.push(...f.constants);
      evidence.push({ target: n.id, source: file });
    }
  }
  fs.writeFileSync(
    path.join(dir, lobbyFile),
    '// Composition: exact lobby child contexts and target geometry; common status artwork from 386:18308.\n' +
      constants.join('\n') +
      '\nexport default function Lobby(){ return <div className="bg-white overflow-clip relative rounded-[25px] size-full" data-node-id="386:18285">' +
      pieces.join('\n') +
      '</div>; }\n',
  );
  fs.writeFileSync(
    path.join(dir, 'final-context-composition.json'),
    JSON.stringify({ frame: g.id, evidence }, null, 2) + '\n',
  );
}

const assets = {},
  layouts = {};
const definitions = [
  ['chevron_backward', 'I386:18242;54616:25486', 'finalBack'],
  ['Plus', 'I386:18279;7758:12110', 'finalPlus'],
];
for (const [, id, key] of definitions) {
  const code = text(`contexts/${id.replaceAll(':', '-').replaceAll(';', '_')}-final-component.txt`);
  const url = code.match(/const \w+ = "(https:[^"]+)"/)?.[1];
  if (!url) throw Error('Missing exact SVG ' + id);
  assets[key] = { url, file: `assets/figma/final/common/${key}.svg` };
}
for (const frame of config.frames) {
  const g = read(`contexts/${frame.replace(':', '-')}-final-geometry.json`),
    replacements = {};
  for (const n of g.nodes.filter((n) => n.type === 'INSTANCE')) {
    const definition = definitions.find(([name]) => name === n.name);
    if (!definition) continue;
    const [, id, key] = definition,
      child = g.nodes.find((c) => c.parent === n.id);
    if (!child) throw Error('Missing icon geometry ' + n.id);
    const code = text(
      `contexts/${id.replaceAll(':', '-').replaceAll(';', '_')}-final-component.txt`,
    );
    const values = code
      .match(/inset-\[([^\]]+)\]/)?.[1]
      .split('_')
      .map((v) => parseFloat(v) / 100) ?? [0];
    const [t, r = t, b = t, l = r] = values;
    replacements[n.id] = [
      {
        kind: 'image',
        id: child.id,
        key,
        x: child.x + child.w * l,
        y: child.y + child.h * t,
        w: child.w * (1 - l - r),
        h: child.h * (1 - t - b),
        opacity: 1,
        radius: 0,
        fit: 'fill',
      },
    ];
  }
  if (frame === '386:18241') {
    const n = g.nodes.find((n) => n.id === 'I386:18277;29221:1484');
    replacements.IconlyRegularLightSearch = [
      {
        kind: 'image',
        id: n.id,
        key: 'imgSearch',
        x: n.x - n.w * 0.04,
        y: n.y - n.h * 0.039,
        w: n.w * 1.08,
        h: n.h * 1.078,
        opacity: 1,
        radius: 0,
        fit: 'fill',
      },
    ];
  }
  if (frame === '386:8558') {
    for (const [tag, id] of [
      ['Group36778', '386:8562'],
      ['Group36779', '386:8563'],
      ['Feature', '386:8567'],
    ]) {
      const descendants = new Set([id]);
      for (const n of g.nodes) if (descendants.has(n.parent)) descendants.add(n.id);
      replacements[tag] = g.nodes
        .filter(
          (n) =>
            n.id !== id && descendants.has(n.id) && (n.type === 'TEXT' || n.type === 'RECTANGLE'),
        )
        .map((n) => ({
          kind: n.type === 'TEXT' ? 'text' : 'shape',
          id: n.id,
          x: n.x,
          y: n.y,
          w: n.w,
          h: n.h,
          opacity: 1,
          color: n.color,
          radius: n.radius ?? 0,
          text: n.text,
          runs: n.runs,
          align: n.align,
          nowrap: false,
        }));
    }
  }
  const background = g.nodes.find((n) => n.name === 'Rectangle 855' || n.name === 'Rectangle 851');
  if (background) {
    replacements[background.id] = [
      {
        kind: 'image',
        id: background.id,
        key: frame === '386:18285' ? 'n386_18289_imgRectangle851' : 'imgRectangle855',
        x: background.x,
        y: background.y,
        w: background.w,
        h: background.h,
        opacity: frame === '386:18285' ? 0.8 : 0.7,
        radius: 0,
        fit: 'cover',
      },
    ];
  }
  if (frame === '391:25009') {
    // These SVGs contain only the visible arc bounds. Their Figma ellipse nodes
    // are 220px squares, but the nested CSS wrappers carry each actual slot.
    for (const [id, key, left, top, right, bottom] of [
      ['391:25021', 'imgEllipse', 0.5, 0, 0.0476, 0.6533],
      ['391:25023', 'imgEllipse2', 0.5, 0.7624, 0.1577, 0],
      ['391:25024', 'imgEllipse3', 0, 0, 0.5, 0],
    ]) {
      const n = g.nodes.find((n) => n.id === id);
      replacements[id] = [
        {
          kind: 'image',
          id,
          key,
          x: n.x + n.w * left,
          y: n.y + n.h * top,
          w: n.w * (1 - left - right),
          h: n.h * (1 - top - bottom),
          opacity: 1,
          radius: 0,
          fit: 'fill',
        },
      ];
    }
  }
  layouts[frame] = { replacements };
}
fs.writeFileSync(
  path.join(dir, 'final-component-assets.json'),
  JSON.stringify(assets, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(dir, 'final-component-layout.json'),
  JSON.stringify(layouts, null, 2) + '\n',
);
