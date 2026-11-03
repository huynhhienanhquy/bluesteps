const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const evidence = path.join(root, 'docs/figma-fidelity');
const captures = JSON.parse(
  fs.readFileSync(path.join(evidence, 'rendered/capture-report-handbook.json'), 'utf8'),
);
const frames = [
  ['386-14521', 'plastic'],
  ['386-14595', 'carton'],
  ['386-14670', 'textiles'],
  ['386-14745', 'battery'],
  ['386-14820', 'organic'],
  ['386-14895', 'glass'],
  ['386-14970', 'paper'],
]
  .map(([frame, material]) => [frame, `/handbook/${material}`])
  .concat([
    ['386-13263', '/handbook'],
    ['386-13313', '/handbook?variant=active'],
    ['386-13364', '/handbook/list'],
    ['386-13593', '/handbook/category/inorganic'],
    ['386-13782', '/handbook/category/organic'],
    ['386-13929', '/handbook/category/recycle'],
    ['386-13685', '/handbook/category/inorganic?expanded=1'],
    ['386-13838', '/handbook/category/organic?expanded=1'],
    ['386-14037', '/handbook/category/recycle?expanded=1'],
  ]);
const observations = [];
for (const [frame, route] of frames) {
  const text = fs
    .readFileSync(path.join(evidence, 'contexts', `${frame}.txt`), 'utf8')
    .split('SUPER CRITICAL:')[0];
  const source = ts.createSourceFile(
    `${frame}.tsx`,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const attributes = (node) =>
    ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  const attribute = (node, name) =>
    attributes(node).properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(source) === name)
      ?.initializer;
  const classes = (node) => {
    const value = attribute(node, 'className');
    return value && ts.isStringLiteral(value) ? value.text : '';
  };
  let navigation;
  const find = (node) => {
    if (
      ts.isJsxElement(node) &&
      ((classes(node).includes('w-[444px]') && classes(node).includes('top-[87.47%]')) ||
        (classes(node).includes('left-[calc(50%+1px)]') && classes(node).includes('top-[810px]')))
    )
      navigation = node;
    ts.forEachChild(node, find);
  };
  find(source);
  if (!navigation) throw new Error(`Missing original navigation context for ${frame}`);

  // Evaluate only the static positioning classes present in this cached Figma subtree.
  // Expected boxes come from the design response, independently of application code.
  const box = (className, parent) => {
    if (className.split(' ').includes('contents')) return parent;
    const rules = {};
    for (const token of className.split(' ')) {
      const inset = token.match(/^inset-\[(.*)\]$/);
      if (inset) {
        const values = inset[1].split('_');
        const expanded =
          values.length === 1
            ? [values[0], values[0], values[0], values[0]]
            : values.length === 2
              ? [values[0], values[1], values[0], values[1]]
              : values;
        ['top', 'right', 'bottom', 'left'].forEach((key, i) => (rules[key] = expanded[i]));
      }
      const positioned = token.match(/^(top|right|bottom|left|w|h)-(.+)$/);
      if (positioned) rules[positioned[1]] = positioned[2].replace(/^\[|\]$/g, '');
      if (token === 'size-full') rules.w = rules.h = 'full';
      if (token.startsWith('size-[')) rules.w = rules.h = token.slice(6, -1);
      if (token.startsWith('aspect-[')) rules.aspect = token.slice(8, -1);
    }
    const value = (input, dimension) => {
      if (input === undefined) return undefined;
      if (input === 'full') return dimension;
      const calculated = input.match(/^calc\(([\d.]+)%([+-])([\d.]+)px\)$/);
      if (calculated)
        return (
          (Number(calculated[1]) * dimension) / 100 +
          Number(calculated[3]) * (calculated[2] === '+' ? 1 : -1)
        );
      if (input.endsWith('%')) return (parseFloat(input) * dimension) / 100;
      if (input.includes('/')) {
        const [numerator, denominator] = input.split('/').map(Number);
        return (dimension * numerator) / denominator;
      }
      const result = parseFloat(input);
      if (!Number.isFinite(result)) throw new Error(`Unsupported dimension ${input}`);
      return result;
    };
    const left = value(rules.left, parent.w),
      right = value(rules.right, parent.w);
    const top = value(rules.top, parent.h),
      bottom = value(rules.bottom, parent.h);
    const w =
      value(rules.w, parent.w) ??
      (left !== undefined && right !== undefined ? parent.w - left - right : parent.w);
    let h =
      value(rules.h, parent.h) ??
      (top !== undefined && bottom !== undefined ? parent.h - top - bottom : parent.h);
    if (rules.aspect && rules.h === undefined) h = w / value(rules.aspect, 1);
    let x = parent.x + (left ?? (right !== undefined ? parent.w - right - w : 0));
    let y = parent.y + (top ?? (bottom !== undefined ? parent.h - bottom - h : 0));
    if (className.split(' ').includes('-translate-x-1/2')) x -= w / 2;
    if (className.split(' ').includes('-translate-y-1/2')) y -= h / 2;
    return { x, y, w, h };
  };
  const slots = [];
  const walk = (node, parent, parentId) => {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    const bounds = box(classes(node), parent);
    const id = attribute(node, 'data-node-id');
    const nodeId = id && ts.isStringLiteral(id) ? id.text : parentId;
    const src = attribute(node, 'src');
    if (src && ts.isJsxExpression(src) && src.expression && ts.isIdentifier(src.expression))
      slots.push({ key: src.expression.text, nodeId, ...bounds });
    if (ts.isJsxElement(node)) for (const child of node.children) walk(child, bounds, nodeId);
  };
  walk(navigation, { x: 0, y: 0, w: 428, h: 926 }, frame.replace('-', ':'));
  const expectedSlots = route.includes('expanded=1') ? 6 : 11;
  if (slots.length !== expectedSlots)
    throw new Error(
      `Expected ${expectedSlots} original SVG slots, got ${slots.length} for ${frame}`,
    );
  for (const width of [428, 390]) {
    const capture = captures.results.find(
      (r) => r.path === route && r.viewport.startsWith(`${width}x`),
    );
    if (!capture) throw new Error(`Missing capture for ${frame} at ${width}`);
    const scale = width / 428;
    for (const slot of slots) {
      const file = path.join(root, 'apps/mobile/assets/figma', frame, `${slot.key}.svg`);
      const bytes = fs.readFileSync(file);
      const hash = crypto.createHash('md5').update(bytes).digest('hex');
      const expected = {
        x: slot.x * scale,
        y: slot.y * scale,
        width: slot.w * scale,
        height: slot.h * scale,
      };
      const candidates = capture.images.filter(
        (image) => image.src.includes(`.${hash}.svg`) && image.loaded,
      );
      const error = (image) =>
        Math.max(...Object.keys(expected).map((key) => Math.abs(image[key] - expected[key])));
      const actual = candidates.sort((a, b) => error(a) - error(b))[0];
      observations.push({
        frame,
        viewport: capture.viewport,
        key: slot.key,
        nodeId: slot.nodeId,
        source: path.relative(root, file).replaceAll('\\', '/'),
        nonEmpty: bytes.length > 0,
        expected,
        actual: actual ?? null,
        maxGeometryDifference: actual ? error(actual) : null,
        withinRoundedContextTolerance: actual ? error(actual) <= 0.1 : false,
      });
    }
  }
}
const report = {
  comparison:
    'SVG bytes match local source by MD5; layout boxes are independently derived from cached Figma JSX classes.',
  tolerance:
    '0.1 CSS pixel for rounded Figma percentage classes and browser layout quantization; this is not a claim of pixel equivalence.',
  slots: observations.length,
  mismatches: observations.filter((o) => !o.nonEmpty || !o.withinRoundedContextTolerance),
  observations,
};
fs.writeFileSync(
  path.join(evidence, 'guide-navigation-layout-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    slots: report.slots,
    mismatches: report.mismatches.length,
    maximumDifference: Math.max(...observations.map((o) => o.maxGeometryDifference ?? Infinity)),
  }),
);
