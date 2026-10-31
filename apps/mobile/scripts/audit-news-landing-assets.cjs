const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const captures = read('docs/figma-fidelity/rendered/capture-report-news-landing-.json');
const assets = read('docs/figma-fidelity/news-landing-asset-map.json');
const frames = [
  ['391:24796', '391-24796-live', '/articles?preview=1', '428x1686'],
  ['386:9787', '386-9787', '/articles?view=latest&preview=1', '428x926'],
  ['386:9901', '386-9901', '/articles?view=events&preview=1', '428x926'],
];
const rows = [];
const unaccounted = [];
for (const [id, context, route, viewport] of frames) {
  const geometry = read(`docs/figma-fidelity/contexts/${id.replace(':', '-')}-geometry.json`);
  const nodes = new Map(geometry.nodes.map((node) => [node.id, node]));
  const code = fs
    .readFileSync(path.join(root, `docs/figma-fidelity/contexts/${context}.txt`), 'utf8')
    .split('SUPER CRITICAL:')[0];
  const ast = ts.createSourceFile(
    'design.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const functions = new Map();
  let entry;
  function expression(node) {
    if (ts.isReturnStatement(node)) return node.expression;
    let result;
    ts.forEachChild(node, (child) => {
      result ||= expression(child);
    });
    return result;
  }
  for (const node of ast.statements) {
    if (ts.isFunctionDeclaration(node)) {
      functions.set(node.name?.text, expression(node));
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword))
        entry = expression(node);
    }
  }
  const expected = [];
  function walk(node, parents = [], instance, componentRoot) {
    if (!node) return;
    if (ts.isParenthesizedExpression(node))
      return walk(node.expression, parents, instance, componentRoot);
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const tag = opening.tagName.getText(ast);
    const props = {};
    for (const attr of opening.attributes.properties) {
      if (!ts.isJsxAttribute(attr)) continue;
      const value = attr.initializer;
      props[attr.name.getText(ast)] =
        value && ts.isStringLiteral(value)
          ? value.text
          : value && ts.isJsxExpression(value)
            ? value.expression?.getText(ast)
            : true;
    }
    const rawId = props['data-node-id'];
    if (functions.has(tag)) {
      const body = functions.get(tag);
      const openingRoot = ts.isParenthesizedExpression(body)
        ? body.expression.openingElement
        : body.openingElement;
      const originalRoot = openingRoot.attributes.properties.find(
        (attr) => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'data-node-id',
      ).initializer.text;
      let instanceId = rawId;
      if (!instanceId) {
        const parentId = [...parents].reverse().find((parent) => nodes.has(parent.id))?.id;
        const candidates = geometry.nodes.filter(
          (candidate) => candidate.parent === parentId && candidate.type === 'INSTANCE',
        );
        const childIds = [...body.getText(ast).matchAll(/data-node-id="([^"]+)"/g)]
          .map((match) => match[1])
          .slice(1);
        const matching = candidates.filter((candidate) =>
          childIds.some((childId) => nodes.has(`I${candidate.id};${childId}`)),
        );
        if (matching.length !== 1)
          throw new Error(`Cannot correlate component ${tag} under ${parentId}`);
        instanceId = matching[0].id;
      }
      return walk(body, parents, instanceId, originalRoot);
    }
    const actualId = rawId
      ? instance
        ? rawId === componentRoot
          ? instance
          : `I${instance};${rawId}`
        : rawId
      : null;
    if (tag === 'img') {
      let index = parents.length - 1;
      while (index >= 0 && !nodes.has(parents[index].id)) index--;
      if (index < 0) throw new Error(`No geometry for ${props.src}`);
      const base = nodes.get(parents[index].id);
      let { x, y, width, height } = base;
      for (const inner of parents.slice(index + 1)) {
        const inset = inner.className?.match(/(?:^|\s)inset-\[([^\]]+)\]/)?.[1];
        if (!inset) continue;
        const parts = inset.split('_');
        const values =
          parts.length === 1
            ? [parts[0], parts[0], parts[0], parts[0]]
            : parts.length === 2
              ? [parts[0], parts[1], parts[0], parts[1]]
              : parts;
        const px = (value, size) => parseFloat(value) * (value.endsWith('%') ? size / 100 : 1);
        const [top, right, bottom, left] = values.map((value, axis) =>
          px(value, axis % 2 ? width : height),
        );
        x += left;
        y += top;
        width -= left + right;
        height -= top + bottom;
      }
      if (props.src === 'imgLine54') {
        x = base.x - 0.5;
        y = base.y;
        width = 1;
        height = 30;
      }
      expected.push({
        key: props.src,
        nodeId: base.id,
        geometry: [x, y, width, height],
        cover: /object-cover/.test(props.className || ''),
      });
      return;
    }
    if (ts.isJsxElement(node))
      for (const child of node.children)
        walk(
          child,
          [
            ...parents,
            { id: actualId, className: typeof props.className === 'string' ? props.className : '' },
          ],
          instance,
          componentRoot,
        );
  }
  walk(entry);
  if (id === '386:9787') {
    expected.push(
      { key: 'chevronBackward', nodeId: '386:9858', geometry: [332, 399, 22, 22] },
      { key: 'chevronForward', nodeId: '386:9861', geometry: [367, 399, 22, 22] },
    );
  }
  for (const targetViewport of [viewport, '390x844']) {
    const capture = captures.results.find(
      (item) => item.path === route && item.viewport === targetViewport,
    );
    if (!capture) throw new Error(`Missing capture ${route}`);
    const available = new Set(capture.images.map((_, index) => index));
    for (const original of expected) {
      const item = { ...original, geometry: [...original.geometry] };
      if (targetViewport === '390x844') {
        const ratio = 390 / 428;
        if (id !== '391:24796') item.geometry = item.geometry.map((value) => value * ratio);
        else if (item.geometry[1] >= 1570) {
          const [x, y, w, h] = item.geometry;
          item.geometry = [x * ratio, 844 - 116 * ratio + (y - 1570) * ratio, w * ratio, h * ratio];
        } else if (['imgHeroBanner', 'imgFrame'].includes(item.key)) item.geometry[2] -= 38;
        else if (
          [
            'imgMenu',
            'imgArrowRight',
            'imgMessageCircle',
            'imgRectangle',
            'imgCombinedShape',
            'imgRectangle1',
            'imgWifi',
            'imgMobileSignal',
          ].includes(item.key)
        )
          item.geometry[0] -= 38;
      }
      const mapped = assets.find(
        (asset) => asset.frame === id.replace(':', '-') && asset.name === item.key,
      );
      const source =
        mapped?.local ??
        `apps/mobile/assets/figma/386-9787/${item.key === 'chevronBackward' ? 'chevron-backward' : 'chevron-forward'}.svg`;
      const file = path.join(root, source);
      const nonempty = fs.existsSync(file) && fs.statSync(file).size > 0;
      const md5 = nonempty ? createHash('md5').update(fs.readFileSync(file)).digest('hex') : null;
      const candidates = [...available]
        .filter((index) => capture.images[index].src.includes(`.${md5}.`))
        .map((index) => {
          const image = capture.images[index];
          const actual = [image.x, image.y, image.width, image.height];
          return {
            index,
            image,
            actual,
            difference: Math.max(
              ...actual.map((value, field) => Math.abs(value - item.geometry[field])),
            ),
          };
        })
        .sort((a, b) => a.difference - b.difference);
      const match = candidates[0];
      if (match) available.delete(match.index);
      rows.push({
        frame: id,
        viewport: targetViewport,
        ...item,
        source,
        callsite:
          'apps/mobile/src/features/content/NewsLandingScreen.tsx (Artwork/StaticArt/LandingCard), shared NewsDesignNavigation',
        md5,
        nonempty,
        actual: match?.actual,
        loaded: match?.image.loaded ?? false,
        opacity: match?.image.opacity,
        fit: match?.image.fit,
        exactLocalSource: !!match,
        maximumDifference: match?.difference ?? null,
        passed:
          nonempty &&
          !!match &&
          match.image.loaded &&
          match.difference <= 0.1 &&
          match.image.opacity === 1 &&
          (!item.cover || match.image.fit === 'cover'),
      });
    }
    if (available.size)
      unaccounted.push({ frame: id, images: [...available].map((index) => capture.images[index]) });
  }
}
const result = {
  coordinateSource:
    'High-fidelity Figma JSX image slots expanded through its original Item components, correlated with fresh read-only Figma node bounds. Nested SVG effect insets and original rotated 1px strokes retained. Source expectations do not read product implementation coordinates.',
  toleranceCssPx: 0.1,
  slots: rows.length,
  failed: rows.filter((row) => !row.passed).length,
  unaccounted,
  rows,
};
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/news-landing-asset-audit.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      slots: result.slots,
      failed: result.failed,
      unaccounted,
      mismatches: rows.filter((row) => !row.passed),
    },
    null,
    2,
  ),
);
if (result.failed || unaccounted.length) process.exitCode = 1;
