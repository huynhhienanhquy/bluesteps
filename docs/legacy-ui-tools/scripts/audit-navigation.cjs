// Read-only route audit. References are candidates, not proof of UI reachability.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'apps/mobile');
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const routeFiles = walk(path.join(mobile, 'app')).filter(
  (file) => file.endsWith('.tsx') && !/[/\\](?:_layout|\+[^/\\]+)\.tsx$/.test(file),
);
const routes = routeFiles.map((file) => {
  const route =
    '/' +
    path
      .relative(path.join(mobile, 'app'), file)
      .replaceAll('\\', '/')
      .replace(/\.tsx$/, '')
      .split('/')
      .filter((part) => !/^\(.*\)$/.test(part))
      .join('/')
      .replace(/(^|\/)index$/, '');
  return { route: route || '/', file: relative(file) };
});
const match = (candidate) => {
  const pathname = candidate.split(/[?#]/)[0];
  const parts = pathname.split('/');
  return routes.filter(({ route }) => {
    const expected = route.split('/');
    return (
      parts.length === expected.length &&
      parts.every((part, i) => part === expected[i] || part === '*' || /^\[.+\]$/.test(expected[i]))
    );
  });
};
const references = [];
for (const file of [...walk(path.join(mobile, 'src')), ...routeFiles]) {
  if (!/\.tsx?$/.test(file) || /\.(test|spec)\./.test(file)) continue;
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    let value;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) value = node.text;
    else if (ts.isTemplateExpression(node))
      value = node.head.text + node.templateSpans.map((span) => '*' + span.literal.text).join('');
    if (value?.startsWith('/') && !value.startsWith('//')) {
      references.push({
        value,
        file: relative(file),
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        targets: match(value).map((item) => item.route),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const targets = require('./fidelity-targets.cjs');
const frameRoutes = targets.map((frame) => ({
  nodeId: frame.nodeId,
  route: frame.route,
  targets: match(frame.route).map((item) => item.route),
}));
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Local app source and saved 211-frame inventory; not live Figma prototype reactions.',
  routeCount: routes.length,
  frameCount: frameRoutes.length,
  missingFrameRoutes: frameRoutes.filter((frame) => !frame.targets.length),
  unmatchedSourceReferences: references.filter((ref) => !ref.targets.length),
  routesWithNoLiteralReferences: routes.filter(
    ({ route }) => !references.some((ref) => ref.targets.includes(route)),
  ),
  limitations: [
    'Literal references include fallback paths and inactive exports; they do not prove a clickable entry point.',
    'Runtime state transitions and return behavior require interaction tests.',
  ],
  routes,
  frameRoutes,
  references,
};
const output = path.join(root, 'docs/ui-progress-evidence-2026-10-31/navigation-static.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    { ...report, routes: undefined, frameRoutes: undefined, references: undefined },
    null,
    2,
  ),
);
if (report.missingFrameRoutes.length || report.unmatchedSourceReferences.length)
  process.exitCode = 1;
