const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const [group, ...ids] = process.argv.slice(2);
if (!/^[a-z][a-z-]*$/.test(group ?? '') || !ids.length || ids.some((id) => !/^\d+-\d+$/.test(id)))
  throw new Error('Pass an asset group and Figma node IDs as 123-456.');
const result = {};
const popupResult = {};
for (const id of ids) {
  const context = fs
    .readFileSync(
      path.resolve(__dirname, '../../../docs/figma-fidelity/contexts', `${id}.txt`),
      'utf8',
    )
    .split('SUPER CRITICAL:')[0];
  const source = ts.createSourceFile(
    `${id}.tsx`,
    context,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const assets = {};
  const popup = {};
  const attr = (attributes, name) =>
    attributes.properties.find(
      (property) => ts.isJsxAttribute(property) && property.name.getText(source) === name,
    )?.initializer;
  const walk = (node, inheritedId) => {
    if (ts.isJsxElement(node)) {
      const value = attr(node.openingElement.attributes, 'data-node-id');
      const nodeId = value && ts.isStringLiteral(value) ? value.text : inheritedId;
      const classValue = attr(node.openingElement.attributes, 'className');
      const className = classValue && ts.isStringLiteral(classValue) ? classValue.text : '';
      const text = node.children
        .filter(ts.isJsxText)
        .map((child) => child.getText(source).trim())
        .join(' ')
        .trim();
      if (nodeId && className.includes('bg-[#f4f8f4]')) popup.panel = nodeId;
      if (nodeId && className.includes('bg-[rgba(217,217,217,0.4)]')) popup.mask = nodeId;
      if (nodeId && text === 'Cách xử lý:') popup.heading = nodeId;
      if (nodeId && text.startsWith('Rác ') && className.includes('text-[20px]'))
        popup.title = nodeId;
      if (
        nodeId &&
        node.children.some(
          (child) =>
            ts.isJsxElement(child) && child.openingElement.tagName.getText(source) === 'ul',
        )
      )
        popup.body = nodeId;
      node.children.forEach((child) => walk(child, nodeId));
    } else if (ts.isJsxSelfClosingElement(node)) {
      const value = attr(node.attributes, 'data-node-id');
      const nodeId = value && ts.isStringLiteral(value) ? value.text : inheritedId;
      const classValue = attr(node.attributes, 'className');
      const className = classValue && ts.isStringLiteral(classValue) ? classValue.text : '';
      if (nodeId && className.includes('bg-[#f4f8f4]')) popup.panel = nodeId;
      if (nodeId && className.includes('bg-[rgba(217,217,217,0.4)]')) popup.mask = nodeId;
      const src = attr(node.attributes, 'src');
      if (
        nodeId &&
        node.tagName.getText(source) === 'img' &&
        src &&
        ts.isJsxExpression(src) &&
        src.expression &&
        ts.isIdentifier(src.expression)
      )
        assets[nodeId] = src.expression.text;
    } else ts.forEachChild(node, (child) => walk(child, inheritedId));
  };
  walk(source, undefined);
  result[id.replace('-', ':')] = assets;
  if (popup.panel) popupResult[id.replace('-', ':')] = popup;
  console.log(`${id}: ${Object.keys(assets).length} original asset nodes`);
}
fs.writeFileSync(
  path.resolve(__dirname, `../../../docs/figma-fidelity/${group}-context-asset-map.json`),
  JSON.stringify(result, null, 2) + '\n',
);
fs.writeFileSync(
  path.resolve(__dirname, `../../../docs/figma-fidelity/${group}-popup-context-map.json`),
  JSON.stringify(popupResult, null, 2) + '\n',
);
