const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const directory = path.join(root, 'docs/figma-fidelity');
const frames = [
  ['386:9376', 'green-class', false],
  ['386:7054', 'green-class', true],
  ['386:9470', 'beach', false],
  ['386:17397', 'beach', true],
  ['386:9575', 'school-class', false],
  ['386:9681', 'school-class', true],
  ['386:10026', 'garden', false],
  ['386:17299', 'garden', true],
];
const result = {};
const clean = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
for (const [frame, eventId, interested] of frames) {
  const key = frame.replace(':', '-');
  const geometry = JSON.parse(
    fs.readFileSync(path.join(directory, `contexts/${key}-geometry.json`), 'utf8'),
  );
  const nodes = new Map(geometry.nodes.map((node) => [node.id, node]));
  const source = fs
    .readFileSync(path.join(directory, `contexts/${key}.txt`), 'utf8')
    .split('SUPER CRITICAL:')[0];
  const ast = ts.createSourceFile(
    'design.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const functions = new Map();
  const pictures = [];
  const textColors = new Map();
  const attrs = (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    return Object.fromEntries(
      opening.attributes.properties.filter(ts.isJsxAttribute).map((attr) => {
        const v = attr.initializer;
        return [
          attr.name.getText(ast),
          v && ts.isStringLiteral(v)
            ? v.text
            : v && ts.isJsxExpression(v)
              ? v.expression?.getText(ast)
              : true,
        ];
      }),
    );
  };
  const body = (node) => {
    if (ts.isReturnStatement(node)) return node.expression;
    let found;
    ts.forEachChild(node, (child) => {
      found ||= body(child);
    });
    return found && ts.isParenthesizedExpression(found) ? found.expression : found;
  };
  let entry;
  for (const node of ast.statements)
    if (ts.isFunctionDeclaration(node)) {
      functions.set(node.name?.text, body(node));
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword))
        entry = body(node);
    }
  const box = (node) => ({ x: node.x, y: node.y, w: node.width, h: node.height });
  const descendants = (node, parent) => {
    while (node) {
      if (node.id === parent) return true;
      node = nodes.get(node.parent);
    }
    return false;
  };
  const number = (c, name) =>
    Number(c.match(new RegExp(`(?:^| )${name}-\\[(-?[\\d.]+)px\\]`))?.[1]);
  function cssBox(c, parent) {
    let r = { ...parent };
    const inset = c.match(/(?:^| )inset-\[([^\]]+)\]/)?.[1];
    if (inset) {
      const values = inset
        .split('_')
        .map((value, index) =>
          value.endsWith('%')
            ? (parseFloat(value) / 100) * (index % 2 ? parent.w : parent.h)
            : parseFloat(value),
        );
      const [top, right = top, bottom = top, left = right] = values;
      r = {
        x: parent.x + left,
        y: parent.y + top,
        w: parent.w - left - right,
        h: parent.h - top - bottom,
      };
    }
    const left = c.match(/(?:^| )left-\[(-?[\d.]+)%\]/)?.[1];
    const right = c.match(/(?:^| )right-\[(-?[\d.]+)%\]/)?.[1];
    const top = c.match(/(?:^| )top-\[(-?[\d.]+)%\]/)?.[1];
    if (left !== undefined) r.x = parent.x + (Number(left) / 100) * parent.w;
    if (right !== undefined && left !== undefined)
      r.w = ((100 - Number(left) - Number(right)) / 100) * parent.w;
    if (top !== undefined) r.y = parent.y + (Number(top) / 100) * parent.h;
    for (const [name, dimension] of [
      ['left', 'x'],
      ['top', 'y'],
      ['w', 'w'],
      ['h', 'h'],
    ]) {
      const n = number(c, name);
      if (Number.isFinite(n))
        r[dimension] = name === 'left' || name === 'top' ? parent[dimension] + n : n;
    }
    const size = number(c, 'size');
    if (Number.isFinite(size)) r.w = r.h = size;
    const aspect = c.match(/aspect-\[([\d.]+)\/([\d.]+)\]/);
    if (aspect) r.h = (r.w * Number(aspect[2])) / Number(aspect[1]);
    return r;
  }
  function walk(node, parent, owner, functionRoot) {
    if (!node) return;
    if (ts.isParenthesizedExpression(node))
      return walk(node.expression, parent, owner, functionRoot);
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    const a = attrs(node);
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const tag = opening.tagName.getText(ast);
    const c = typeof a.className === 'string' ? a.className : '';
    if (functions.has(tag)) {
      const functionNode = functions.get(tag);
      const functionAttrs = attrs(functionNode);
      let target = nodes.get(a['data-node-id']);
      if (!target) {
        const candidates = geometry.nodes.filter(
          (n) => n.name === functionAttrs['data-name'] && descendants(n, owner?.id),
        );
        const x = (parent?.x ?? 0) + (number(c, 'ml') || 0);
        const y = (parent?.y ?? 0) + (number(c, 'mt') || 0);
        target = candidates.sort(
          (p, q) => Math.abs(p.x - x) + Math.abs(p.y - y) - Math.abs(q.x - x) - Math.abs(q.y - y),
        )[0];
      }
      if (!target) throw Error(`No geometry for component ${tag} in ${frame}`);
      return walk(functionNode, box(target), target, target);
    }
    const actual = nodes.get(a['data-node-id']);
    const r = actual
      ? box(actual)
      : cssBox(c, parent ?? { x: 0, y: 0, w: 428, h: geometry.height });
    const current = actual ?? owner;
    if (actual?.type === 'TEXT')
      textColors.set(
        actual.id,
        c.match(/text-\[(#[a-fA-F0-9]+)\]/)?.[1] ??
          (c.includes('text-white') ? '#FFFFFF' : c.includes('text-black') ? '#000000' : '#2D528B'),
      );
    if (tag === 'img') {
      const cropClass = c.match(/w-\[([\d.]+)%\]/);
      const sx = cropClass ? 100 / Number(cropClass[1]) : undefined;
      pictures.push({
        id: actual?.id ?? current.id,
        key: a.src,
        opacity: Number(c.match(/(?:^| )opacity-(\d+)(?: |$)/)?.[1] ?? 100) / 100,
        ...parent,
        fit: c.includes('object-cover') ? 'cover' : 'fill',
        radius: owner?.radius ?? 0,
        ...(sx
          ? {
              crop: [
                [sx, 0, (-Number(c.match(/left-\[(-?[\d.]+)%\]/)?.[1] || 0) / 100) * sx],
                [0, 1, -Number(c.match(/top-\[(-?[\d.]+)%\]/)?.[1] || 0) / 100],
              ],
            }
          : {}),
      });
    } else if (ts.isJsxElement(node)) {
      for (const child of node.children) walk(child, r, current, functionRoot);
    }
  }
  walk(entry, undefined, nodes.get(frame));
  // The play polygon's JSX wrapper rotates 90 degrees around a 24x28 slot.
  // Keep the original 18.9832x15.63 SVG viewbox and its transformed center.
  for (const picture of pictures.filter((p) => p.key === 'imgPolygon4')) {
    const slot = nodes.get(picture.id);
    Object.assign(picture, {
      x: slot.x + 4.324,
      y: slot.y + 6.185,
      w: 18.9832,
      h: 15.63,
      rotation: 90,
    });
  }
  const texts = geometry.nodes
    .filter((n) => n.type === 'TEXT')
    .map((n) => ({
      id: n.id,
      ...box(n),
      text: n.text,
      size: typeof n.fontSize === 'number' ? n.fontSize : 12,
      weight: /Semi/.test(n.fontName?.style)
        ? 'semibold'
        : /Bold/.test(n.fontName?.style)
          ? 'bold'
          : 'regular',
      color: textColors.get(n.id) ?? '#2D528B',
    }));
  const info = geometry.nodes.find((n) => n.name === 'info');
  const introduction = geometry.nodes.find((n) => n.name === 'introduction');
  const introductionTexts = texts
    .filter((n) => descendants(nodes.get(n.id), introduction.id))
    .sort((a, b) => a.y - b.y);
  const relatedHeading = texts.find((n) => n.text === 'Hoạt động khác');
  const related = { x: relatedHeading.x, y: relatedHeading.y + 34, w: 465, h: 201 };
  const navStart = source.lastIndexOf('src={imgRectangle87}');
  const nav = [...source.slice(navStart).matchAll(/src=\{(img\w+)\}/g)]
    .map((m) => m[1])
    .slice(0, 7);
  if (nav.length !== 7) throw Error(`Missing navigation ${frame}`);
  const status = /^(imgTime|imgRectangle|imgRectangle1|imgCombinedShape|imgWifi|imgMobileSignal)$/;
  const section = (y, h) => ({
    images: pictures.filter((p) => p.y >= y - 5 && p.y < y + h && p.w < 428),
    texts: texts.filter((t) => t.y >= y && t.y < y + h),
  });
  const people = section(490, 60);
  const stats = section(550, 65);
  result[frame] = {
    eventId,
    interested,
    canvasHeight: geometry.height,
    title: texts.find((t) => descendants(nodes.get(t.id), info.id) && t.size >= 20)?.text,
    titleSize: texts.find((t) => descendants(nodes.get(t.id), info.id) && t.size >= 20)?.size,
    titleWidth: texts.find((t) => descendants(nodes.get(t.id), info.id) && t.size >= 20)?.w,
    area: texts.find((t) => descendants(nodes.get(t.id), info.id) && t.size === 15)?.text,
    background: pictures.filter((p) => p.w > 428),
    hero: pictures.filter((p) => p.y < 389 && p.w <= 428 && !status.test(p.key)),
    location: pictures.find((p) => p.y >= 450 && p.y < 480 && p.w < 30),
    people,
    stats,
    introTitle: clean(introductionTexts[0].text),
    intro: introductionTexts
      .slice(1)
      .map((t) => t.text.replace(/[\u2028\u2029]/g, '\n'))
      .join('\n'),
    related: {
      ...related,
      images: pictures.filter(
        (p) => p.y >= related.y && p.y < related.y + 201 && p.w < 428 && !nav.includes(p.key),
      ),
      texts: texts.filter((t) => t.y >= related.y && t.y < related.y + 201),
    },
    nav,
    actions: eventId === 'green-class' ? (interested ? 'row' : 'column') : 'footer',
    imageSlots: pictures.length,
  };
}
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/features/events/event-detail-design-data.ts'),
  '// Generated from original Figma JSX and measured geometry.\nexport const eventDetailDesignData = ' +
    JSON.stringify(result, null, 2) +
    ';\n',
);
fs.writeFileSync(
  path.join(directory, 'event-detail-layout-source.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    Object.entries(result).map(([frame, data]) => ({
      frame,
      eventId: data.eventId,
      imageSlots: data.imageSlots,
      hero: data.hero.length,
      people: data.people.images.length,
      stats: data.stats.images.length,
      related: data.related.images.length,
    })),
    null,
    2,
  ),
);
