const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('../../apps/mobile/node_modules/typescript');
const reviews = require('./reviews.cjs');
const root = path.resolve(__dirname, '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (file, value) => fs.writeFileSync(path.join(__dirname, file), JSON.stringify(value, null, 2) + '\n');
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const inventory = read('docs/functional-audit-2026-11-02/figma-inventory.json');
const prior = read('docs/ui-recheck-2026-11-01/frame-audit.json');
const batches = fs.readdirSync(__dirname).filter((file) => /^figma-batch-.*\.json$/.test(file)).flatMap((file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8')).frames);
const details = new Map(batches.map((frame) => [frame.id, frame]));
if (details.size !== inventory.frames.length || batches.length !== details.size) throw Error('Figma snapshot is incomplete or duplicated');
for (const frame of inventory.frames) if (!details.has(frame.id)) throw Error('Missing frame: ' + frame.id);
write('figma-requirements.json', { capturedAt: inventory.capturedAt, frames: inventory.frames.map((frame) => details.get(frame.id)) });

const sources = new Map();
const controlTags = new Set(['Button', 'AccountButton', 'EventFlowButton', 'Pressable', 'DesignLink', 'Chip', 'MenuItem', 'Search', 'Field', 'TextInput', 'Switch', 'RewardPill', 'RegistrationField', 'RegistrationAgreement']);
function inspect(file) {
  file = path.resolve(file);
  if (sources.has(file)) return sources.get(file);
  const text = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (node) => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  const row = { file: relative(file), sha256: hash(file), functions: [], controls: [], navigation: [], apiReferences: [], reexports: [], imports: [] };
  sources.set(file, row);
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) row.functions.push({ name: node.name.text, line: line(node), endLine: tree.getLineAndCharacterOfPosition(node.end).line + 1 });
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      row.reexports.push(...node.exportClause.elements.map((item) => ({ original: (item.propertyName ?? item.name).text, alias: item.name.text, module: node.moduleSpecifier.text })));
    }
    if (ts.isImportDeclaration(node)) row.imports.push({ module: node.moduleSpecifier.text, line: line(node) });
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      if (controlTags.has(tag)) {
        const props = {};
        for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && ['title', 'label', 'accessibilityLabel', 'accessibilityHint', 'onPress', 'onChangeText', 'onValueChange', 'disabled', 'editable', 'placeholder', 'accessibilityRole'].includes(prop.name.text)) props[prop.name.text] = prop.initializer?.getText(tree) ?? 'true';
        row.controls.push({ tag, line: line(node), ...props });
      }
    }
    if (ts.isCallExpression(node) && /^router\.(push|replace|back)$/.test(node.expression.getText(tree))) row.navigation.push({ line: line(node), call: node.getText(tree) });
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && node.getText(tree).includes('/v1/')) row.apiReferences.push({ line: line(node), expression: node.getText(tree) });
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return row;
}
function resolve(file, specifier) {
  if (!specifier.startsWith('.')) return null;
  const stem = path.resolve(path.dirname(file), specifier);
  return ['.tsx', '.ts', '/index.tsx', '/index.ts'].map((suffix) => stem + suffix).find(fs.existsSync) ?? null;
}
const routeRoot = path.join(root, 'apps/mobile/app');
const routes = walk(routeRoot).filter((file) => file.endsWith('.tsx') && !/[/\\](_layout|\+not-found)\.tsx$/.test(file)).map((file) => {
  const pattern = '/' + path.relative(routeRoot, file).replaceAll('\\', '/').replace(/\.tsx$/, '').split('/').filter((segment) => !segment.startsWith('(')).join('/').replace(/(^|\/)index$/, '');
  const text = fs.readFileSync(file, 'utf8');
  const symbol = text.match(/export\s*\{\s*(\w+)\s+as\s+default/)?.[1] ?? text.match(/import\s*\{\s*(\w+)/)?.[1];
  const module = text.match(/from\s+['"]([^'"]+)['"]/)?.[1];
  let resolved = module && resolve(file, module), currentSymbol = symbol;
  const chain = [];
  while (resolved) {
    const source = inspect(resolved);
    chain.push(source.file);
    const next = source.reexports.find((item) => item.alias === currentSymbol);
    if (!next) break;
    const target = resolve(resolved, next.module);
    if (!target || chain.includes(relative(target))) break;
    currentSymbol = next.original;
    resolved = target;
  }
  return { pattern: pattern || '/', file: relative(file), sha256: hash(file), component: currentSymbol, source: resolved ? relative(resolved) : null, line: resolved ? inspect(resolved).functions.find((item) => item.name === currentSymbol)?.line ?? 1 : 1, exportChain: chain };
});
for (const directory of ['apps/mobile/src/features/live', 'apps/mobile/src/features/auth', 'apps/mobile/src/services']) for (const file of walk(path.join(root, directory)).filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))) inspect(file);
inspect(path.join(root, 'apps/mobile/app/_layout.tsx'));
inspect(path.join(root, 'apps/mobile/src/providers.tsx'));
write('current-routes.json', routes);
write('source-controls.json', [...sources.values()]);
const matchRoute = (url) => routes.find((route) => new RegExp('^' + route.pattern.split('/').map((segment) => segment.startsWith('[') ? '[^/]+' : segment).join('/') + '$').test(url.split('?')[0]));
const frames = inventory.frames.map((frame) => {
  const baseline = prior.frames.find((item) => item.nodeId === frame.id);
  if (!baseline) throw Error('Unmapped current Figma frame: ' + frame.id);
  const review = { ...reviews.groups[baseline.group], ...reviews.overrides[frame.id] };
  if (!review.status || !review.gap) throw Error('Missing functional review: ' + frame.id);
  const route = matchRoute(review.routeOverride ?? baseline.historicalRoute);
  const requirement = details.get(frame.id);
  return { ...frame, group: baseline.group, figmaURL: baseline.figmaURL, route: route?.pattern ?? null, source: route?.source ?? null, component: route?.component ?? null, sourceLine: route?.line ?? null, texts: requirement.texts, interactions: requirement.interactions, reviewedFunctionality: true, assessment: review.status, implemented: review.implemented, gap: review.gap, findingIds: review.findings, stateExecution: 'NOT_INDIVIDUALLY_ACCEPTED' };
});
write('frame-matrix.json', { capturedAt: new Date().toISOString(), scope: 'All 211 current Figma frames; 10 onboarding frames retained as context, other 201 frames in this audit.', frames });
const transitions = frames.flatMap((frame) => frame.interactions.flatMap((control) => control.reactions.flatMap((reaction) => reaction.actions.map((action) => ({ frameId: frame.id, group: frame.group, sourceRoute: frame.route, controlId: control.id, controlName: control.name, label: control.label, trigger: reaction.trigger, ...action, targetRoute: frames.find((target) => target.id === action.destinationId)?.route ?? null })))));
write('prototype-transitions.json', transitions);
write('source-fingerprints.json', { capturedAt: new Date().toISOString(), files: [...sources.values()].map((source) => ({ file: source.file, sha256: source.sha256 })), routes: routes.map((route) => ({ file: route.file, sha256: route.sha256 })), api: walk(path.join(root, 'apps/api/src')).filter((file) => file.endsWith('.py')).map((file) => ({ file: relative(file), sha256: hash(file) })) });
const groups = Object.groupBy(frames, (frame) => frame.group);
const runtimeFile = path.join(__dirname, 'runtime/runtime-routes.json');
const runtime = fs.existsSync(runtimeFile) ? JSON.parse(fs.readFileSync(runtimeFile, 'utf8')) : [];
const testsDirectory = path.join(__dirname, 'runtime/tests');
const tests = fs.existsSync(testsDirectory) ? fs.readdirSync(testsDirectory).filter((file) => file.endsWith('.json')).map((file) => JSON.parse(fs.readFileSync(path.join(testsDirectory, file), 'utf8'))) : [];
const counts = (rows, key) => rows.reduce((result, row) => (result[row[key]] = (result[row[key]] ?? 0) + 1, result), {});
const summary = { capturedAt: new Date().toISOString(), conclusion: 'NOT_FUNCTIONALLY_COMPLETE_AGAINST_FIGMA', figmaFrames: frames.length, onboardingContext: 10, otherFrames: frames.filter((frame) => frame.group !== 'Onboarding').length, auxiliaryFrames: frames.filter((frame) => frame.group === 'Khung phụ').length, frameRequirementsRead: details.size, currentRoutes: routes.length, runtimeRoutesCaptured: runtime.length, sourceFilesInspected: sources.size, prototypeActionsRead: transitions.length, byAssessment: counts(frames.filter((frame) => frame.group !== 'Onboarding'), 'assessment'), byGroup: Object.fromEntries(Object.entries(groups).map(([group, rows]) => [group, { frames: rows.length, assessment: reviews.groups[group].status }])), tests: tests.map((test) => ({ title: test.title, status: test.status, durationMs: test.durationMs })), limitations: ['Core-flow test pass does not prove all Figma variants or visual fidelity.', 'Camera/photo behavior on real devices is not exercised by browser suite.', 'Existing scan result Chai nhựa and mandatory onboarding are explicit earlier user overrides.', 'Figma get_screenshot timed out; current live text/prototype was captured for all 211 frames.'] };
write('summary.json', summary);
const escape = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const statusLabels = { CORE: 'Luồng cơ bản có', PARTIAL: 'Thiếu một phần', BLOCKED: 'Bị khóa/chưa có dịch vụ', WRONG_FLOW: 'Khác luồng Figma', MISSING_STATE: 'Chưa có trạng thái', INTENTIONAL_DIFFERENCE: 'Khác theo yêu cầu trước', AUXILIARY: 'Khung phụ', PRIOR_SCOPE: 'Phạm vi trước' };
fs.writeFileSync(path.join(__dirname, 'frame-matrix.md'), '# Đối chiếu từng frame Figma\n\nNgày 02/11/2026. Đối chiếu chức năng theo Figma hiện hành và mã hiện tại; CORE chỉ là luồng cơ bản, không phải nghiệm thu toàn bộ trạng thái/hình ảnh/native. Mỗi frame có nội dung và prototype gốc trong figma-requirements.json; nguồn đã được hash.\n\n' + Object.entries(groups).map(([group, rows]) => `## ${group} (${rows.length})\n\n| Frame | Route / source | Đánh giá | Có / còn thiếu |\n|---|---|---|---|\n` + rows.map((frame) => `| [${frame.id} ${escape(frame.name)}](${frame.figmaURL}) | ${escape(frame.route ?? 'Khung phụ')} ${frame.source ? `[${frame.component}](../../${frame.source}#L${frame.sourceLine})` : ''} | ${statusLabels[frame.assessment]} | Có: ${escape(frame.implemented)} **Thiếu/giới hạn:** ${escape(frame.gap)} ${frame.findingIds.join(', ')} |`).join('\n')).join('\n\n') + '\n');
fs.writeFileSync(path.join(__dirname, 'design-requirements.md'), '# Current Figma requirements\n\n' + Object.entries(groups).map(([group, rows]) => `## ${group}\n\n` + rows.map((frame) => `- ${frame.id} **${frame.name}** → ${frame.route ?? 'auxiliary'}\n  - Text: ${frame.texts.join(' · ').replaceAll('\n', ' ')}\n  - Controls: ${frame.interactions.map((control) => control.label || control.name).join(' · ').replaceAll('\n', ' ')}`).join('\n')).join('\n\n'));
console.log(JSON.stringify({ frames: frames.length, requirementsRead: details.size, routes: routes.length, sources: sources.size, prototypeActions: transitions.length, byGroup: Object.fromEntries(Object.entries(groups).map(([group, rows]) => [group, rows.length])) }, null, 2));
