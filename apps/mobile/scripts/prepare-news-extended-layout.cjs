const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const directory = path.join(root, 'docs/figma-fidelity');
const result = {};
for (const frame of ['680:5343', '680:5406', '680:5461']) {
  const key = frame.replace(':', '-');
  const geometry = JSON.parse(
    fs.readFileSync(path.join(directory, `contexts/${key}-geometry.json`), 'utf8'),
  );
  if (geometry.pageId !== '386:7053') throw Error('Outside backuped');
  const nodes = new Map(geometry.nodes.map((node) => [node.id, node]));
  const ast = ts.createSourceFile(
    'design.tsx',
    fs.readFileSync(path.join(directory, `contexts/${key}.txt`), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const images = [];
  function walk(node, parent) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const attrs = Object.fromEntries(
        opening.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attr) => [
            attr.name.getText(ast),
            attr.initializer && ts.isStringLiteral(attr.initializer)
              ? attr.initializer.text
              : attr.initializer && ts.isJsxExpression(attr.initializer)
                ? attr.initializer.expression?.getText(ast)
                : '',
          ]),
      );
      const measured = nodes.get(attrs['data-node-id']);
      let box = measured
        ? { x: measured.x, y: measured.y, w: measured.width, h: measured.height }
        : parent;
      const inset = attrs.className?.match(/inset-\[([^\]]+)\]/)?.[1];
      if (!measured && inset && parent) {
        const units = inset.split('_');
        const [top, right = top, bottom = top, left = right] = units;
        const px = (value, extent) =>
          value.endsWith('%') ? (parseFloat(value) * extent) / 100 : parseFloat(value);
        const [t, r, b, l] = [
          px(top, parent.h),
          px(right, parent.w),
          px(bottom, parent.h),
          px(left, parent.w),
        ];
        box = { x: parent.x + l, y: parent.y + t, w: parent.w - l - r, h: parent.h - t - b };
      }
      if (opening.tagName.getText(ast) === 'img')
        images.push({
          key: attrs.src,
          ...parent,
          fit: attrs.className.includes('object-cover') ? 'cover' : 'fill',
        });
      else if (ts.isJsxElement(node)) node.children.forEach((child) => walk(child, box));
    } else ts.forEachChild(node, (child) => walk(child, parent));
  }
  walk(ast);
  result[frame] = {
    pageId: '386:7053',
    width: 428,
    height: 926,
    images,
    nativeStatusAdaptation:
      'Native OS status/safe area replaces six mock status images. Event cover retains 300px source slot, clips the first 37 source pixels and is overlapped by the body by 34px.',
    navigation: images
      .filter((image) =>
        [
          'imgRectangle87',
          'imgGroup',
          'imgGroup1',
          'imgGroup2',
          'imgGroup37108',
          'imgGroup36731',
          'imgLine1',
        ].includes(image.key),
      )
      .map((image) => ({ ...image, y: image.y - 810 })),
  };
}
fs.writeFileSync(
  path.join(directory, 'news-extended-layout-source.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    Object.entries(result).map(([frame, item]) => ({
      frame,
      images: item.images.length,
      navigation: item.navigation.length,
    })),
  ),
);
