const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const directory = path.join(root, 'docs/figma-fidelity');
const frames = [
  ['386:17608', 'daily-waste'],
  ['386:17701', 'daily-waste'],
  ['386:10644', 'youth-ideas'],
  ['386:17794', 'local-cleanup'],
  ['386:10737', 'green-sunday'],
  ['386:17887', 'storm-cleanup'],
  ['386:10828', 'saigon-cleanup'],
  ['386:17978', 'ha-long'],
  ['386:10919', 'tourism-cleanup'],
];
const read = (file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
const clean = (text) =>
  text
    .split(/\r?\n/)
    .map((line, index, lines) => {
      let value = line.replace(/\t/g, ' ');
      if (index) value = value.replace(/^ +/, '');
      if (index < lines.length - 1) value = value.replace(/ +$/, '');
      return value;
    })
    .filter(Boolean)
    .join(' ');
const results = {};
const assetLines = ['export const newsDetailAssets = {'];
const allAssets = read('news-detail-asset-map.json');
for (const [frame, articleId] of frames) {
  const key = frame.replace(':', '-');
  const geometry = read(`contexts/${key}-geometry.json`);
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
  const elements = new Map();
  const pictures = [];
  const descendants = (id, parent) => {
    let n = nodes.get(id);
    while (n) {
      if (n.parent === parent) return true;
      n = nodes.get(n.parent);
    }
    return false;
  };
  const box = (node) => ({ x: node.x, y: node.y, w: node.width, h: node.height });
  function attributes(node) {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const out = { tag: opening.tagName.getText(ast) };
    for (const a of opening.attributes.properties)
      if (ts.isJsxAttribute(a)) {
        const v = a.initializer;
        out[a.name.getText(ast)] =
          v && ts.isStringLiteral(v)
            ? v.text
            : v && ts.isJsxExpression(v)
              ? v.expression?.getText(ast)
              : true;
      }
    return out;
  }
  function collect(node, parents = []) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = attributes(node);
      if (attrs['data-node-id']) elements.set(attrs['data-node-id'], node);
      if (attrs.tag === 'img') {
        const owner = [...parents].reverse().find((p) => nodes.has(p.attrs['data-node-id']));
        if (!owner) throw new Error(`Missing image owner in ${frame}`);
        const n = nodes.get(owner.attrs['data-node-id']);
        const radius = Number(
          [...parents]
            .reverse()
            .find((p) => /rounded-\[([\d.]+)px\]/.test(p.attrs.className || ''))
            ?.attrs.className.match(/rounded-\[([\d.]+)px\]/)?.[1] || 0,
        );
        const c = attrs.className || '';
        const widthPercent = c.match(/w-\[([\d.]+)%\]/)?.[1];
        const leftPercent = c.match(/left-\[(-?[\d.]+)%\]/)?.[1];
        const topPercent = c.match(/top-\[(-?[\d.]+)%\]/)?.[1];
        const sx = widthPercent ? 100 / Number(widthPercent) : null;
        pictures.push({
          id: n.id,
          key: attrs.src,
          ...box(n),
          fit: c.includes('object-cover') ? 'cover' : 'fill',
          radius,
          flipX: parents.some(
            (p) =>
              p.attrs.className?.includes('-scale-y-100') &&
              p.attrs.className?.includes('rotate-180'),
          ),
          ...(sx
            ? {
                crop: [
                  [sx, 0, (-Number(leftPercent || 0) / 100) * sx],
                  [0, 1, -Number(topPercent || 0) / 100],
                ],
              }
            : {}),
        });
      }
      if (ts.isJsxElement(node))
        for (const child of node.children) collect(child, [...parents, { attrs, node }]);
    } else ts.forEachChild(node, (child) => collect(child, parents));
  }
  collect(ast);
  function styled(
    attrs,
    inherited = { size: 14, weight: 'regular', lineHeight: 17, color: '#000000' },
  ) {
    const c = attrs.className || '';
    const size = Number(c.match(/text-\[([\d.]+)px\]/)?.[1] ?? inherited.size);
    const explicit = c.match(/leading-\[([\d.]+)px\]/)?.[1];
    const normal = c.includes('leading-[normal]');
    return {
      size,
      weight: /font-(bold)|Inter:Bold/.test(c)
        ? 'bold'
        : /font-semibold|Semi_Bold/.test(c)
          ? 'semibold'
          : /font-medium/.test(c)
            ? 'medium'
            : c.includes('font-normal')
              ? 'regular'
              : inherited.weight,
      lineHeight: explicit
        ? Number(explicit)
        : normal
          ? Math.round(size * 1.21)
          : inherited.lineHeight,
      color:
        c.match(/text-\[(#[a-fA-F0-9]+)\]/)?.[1] ??
        (c.includes('text-white')
          ? '#FFFFFF'
          : c.includes('text-black')
            ? '#000000'
            : inherited.color),
    };
  }
  function runs(node, style) {
    if (ts.isJsxText(node)) {
      const text = clean(node.text);
      return text ? [{ text, ...style }] : [];
    }
    if (ts.isJsxExpression(node)) {
      const e = node.expression;
      return e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))
        ? [{ text: e.text, ...style }]
        : [];
    }
    if (!ts.isJsxElement(node)) return [];
    const next = styled(attributes(node), style);
    return node.children.flatMap((child) => runs(child, next));
  }
  function blocks(node, inherited) {
    if (!ts.isJsxElement(node)) return [];
    const attrs = attributes(node);
    const style = styled(attrs, inherited);
    if (attrs.tag === 'ul' || attrs.tag === 'ol') {
      const items = node.children
        .filter(ts.isJsxElement)
        .filter((child) => attributes(child).tag === 'li');
      return items.map((child, index) => ({
        marker: attrs.tag === 'ul' ? '•' : `${Number(attrs.start || 1) + index}.`,
        indent: Number((attributes(child).className || '').match(/ms-\[([\d.]+)px\]/)?.[1] || 15),
        runs: runs(child, style),
      }));
    }
    const children = node.children.filter(ts.isJsxElement);
    if (children.some((child) => ['ul', 'ol', 'p'].includes(attributes(child).tag)))
      return children.flatMap((child) => blocks(child, style));
    return [{ runs: runs(node, style) }];
  }
  function textData(node) {
    const element = elements.get(node.id);
    if (!element) throw new Error(`No JSX for text ${node.id}`);
    const rich = blocks(element, undefined);
    return { id: node.id, ...box(node), text: node.text, blocks: rich };
  }
  const body = geometry.nodes.find(
    (node) => node.parent === frame && node.type === 'FRAME' && node.name.startsWith('Frame '),
  );
  const sections = geometry.nodes
    .filter((node) =>
      ['intro', '2.hình ảnh các loại rác', 'ô nhiểm', 'hành động'].includes(node.name),
    )
    .map((node) => ({
      id: node.id,
      kind:
        node.name === 'intro'
          ? 'intro'
          : node.name === '2.hình ảnh các loại rác'
            ? 'materials'
            : node.name === 'ô nhiểm'
              ? 'consequences'
              : 'actions',
      ...box(node),
      texts: geometry.nodes
        .filter((child) => child.type === 'TEXT' && descendants(child.id, node.id))
        .map(textData)
        .sort((a, b) => a.y - b.y || a.x - b.x),
      images: pictures.filter((image) => descendants(image.id, node.id)),
    }))
    .sort((a, b) => a.y - b.y);
  const title = geometry.nodes.find((n) => n.type === 'TEXT' && n.y === 218);
  const minutes = geometry.nodes.find((n) => n.type === 'TEXT' && n.y === 265);
  const back = source.match(
    /<CodeConnectSnippet data-node-id="([^"]+)" data-name="chevron_backward"/,
  );
  const clock = source.match(/<CodeConnectSnippet data-node-id="([^"]+)" data-name="Clock"/);
  const hero = pictures.find((image) => image.y === 0 && image.w === 428);
  const nav = geometry.nodes.find((node) => node.parent === frame && node.name === 'Group 36735');
  results[frame] = {
    articleId,
    expanded: frame === '386:17701',
    title: title.text,
    titleBox: box(title),
    minutes: minutes.text,
    body: box(body),
    sections,
    hero: hero.key,
    clock: box(nodes.get(clock[1])),
    navOffset: nav.x + 8,
    ...(back ? { back: box(nodes.get(back[1])) } : {}),
    discussion: geometry.nodes.some((n) => n.name === 'Prototype / Mở thảo luận'),
  };
  assetLines.push(`  '${frame}': {`);
  for (const a of allAssets.filter((a) => a.frame === key))
    assetLines.push(
      `    ${a.name}: require('../../assets/figma/${key}/${path.basename(a.local)}'),`,
    );
  assetLines.push(`    clock: require('../../assets/figma/${key}/clock.svg'),`);
  if (back) assetLines.push(`    back: require('../../assets/figma/${key}/back.svg'),`);
  assetLines.push('  },');
}
assetLines.push('};');
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/design-system/news-detail-assets.ts'),
  assetLines.join('\n') + '\n',
);
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/features/content/news-detail-design-data.ts'),
  '// Original rich copy and section measurements from high-fidelity Figma JSX.\nexport const newsDetailDesignData = ' +
    JSON.stringify(results, null, 2) +
    ';\n',
);
fs.writeFileSync(
  path.join(directory, 'news-detail-layout-source.json'),
  JSON.stringify(results, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    Object.entries(results).map(([id, data]) => ({
      id,
      articleId: data.articleId,
      sections: data.sections.length,
      body: data.body,
      images: data.sections.flatMap((section) => section.images).length,
    })),
    null,
    2,
  ),
);
