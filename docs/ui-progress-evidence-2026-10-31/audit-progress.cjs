// Read-only source/catalog audit. Runtime checks are recorded separately in validation.json.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const exists = (file) => fs.existsSync(path.join(root, file));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const walk = (folder) => fs.readdirSync(path.join(root, folder), { withFileTypes: true }).flatMap((entry) => {
  const file = `${folder}/${entry.name}`;
  return entry.isDirectory() ? walk(file) : [file];
});
const inventory = read('docs/ui-progress-evidence-2026-10-30/figma-live-inventory.json');
const previousAudit = read('docs/ui-progress-evidence-2026-10-30/frame-audit.json');
const previous = read('docs/ui-progress-evidence-2026-10-30/news-landing-validation.json');
const coverage = read('docs/figma-fidelity/coverage.json');
const targets = require(path.join(root, 'apps/mobile/scripts/fidelity-targets.cjs'));
const priorById = new Map(previousAudit.frames.map((frame) => [frame.nodeId, frame]));
const targetById = new Map(targets.map((target) => [target.nodeId, target]));
const routes = walk('apps/mobile/app').filter((file) => /\.tsx$/.test(file) && !file.endsWith('/_layout.tsx'));
const routePaths = new Set(routes.map((file) => file.replace('apps/mobile/app', '').replace(/\.tsx$/, '').replace(/\/\([^/]+\)/g, '').replace(/\/index$/, '') || '/'));
const routePatterns = [...routePaths].map((route) => new RegExp('^' + route.split('/').map((segment) => {
  if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
  if (/^\[.+\]$/.test(segment)) return '[^/]+';
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}).join('/') + '$'));
const frames = inventory.children.filter((node) => node.type === 'FRAME').map((node) => {
  const target = targetById.get(node.id);
  const key = node.id.replace(':', '-');
  const source = target ? `apps/mobile/${target.implementation}` : null;
  return {
    nodeId: node.id, name: node.name, group: priorById.get(node.id)?.group ?? 'Unclassified',
    route: target?.route ?? null, source, sourceExists: source ? exists(source) : false,
    routeExists: target ? routePatterns.some((pattern) => pattern.test(target.route.split('?')[0])) : false,
    contextExists: exists(`docs/figma-fidelity/contexts/${key}.txt`),
    referenceExists: exists(`docs/figma-fidelity/reference/${key}.png`),
    renderedExists: target ? exists(`docs/figma-fidelity/rendered/${target.name}-428.png`) : false,
    status: target ? 'mapped-awaiting-complete-visual-audit' : 'pending',
  };
});
const groups = {};
for (const frame of frames) {
  const group = groups[frame.group] ??= { total: 0, mapped: 0, remaining: 0 };
  group.total++;
  group[frame.source ? 'mapped' : 'remaining']++;
}
const sourceHashes = Object.entries(previous.sourceHashes).map(([file, expected]) => ({
  file, sha256: exists(file) ? sha256(file) : null, matchesPreviousEvidence: exists(file) && sha256(file) === expected,
}));
const productFiles = [...walk('apps/mobile/app'), ...walk('apps/mobile/src')].filter((file) => /\.(ts|tsx)$/.test(file));
const preparationModules = [
  'apps/mobile/src/features/content/news-detail-design-data.ts',
  'apps/mobile/src/design-system/news-detail-assets.ts',
];
const preparation = preparationModules.map((file) => {
  const moduleName = path.basename(file, '.ts');
  return { file, exists: exists(file), importedByProductFiles: productFiles.filter((candidate) => candidate !== file && fs.readFileSync(path.join(root, candidate), 'utf8').includes(moduleName)) };
});
const mapped = frames.filter((frame) => frame.source).length;
const result = {
  checkedAt: new Date().toISOString(), timezone: 'Asia/Bangkok', scope: 'Local code and saved Figma inventory; no fresh Figma or remote Git read',
  branch: git('branch', '--show-current'), localHead: git('rev-parse', 'HEAD'),
  inventoryCapturedOn: inventory.checkedOn, totalFrames: frames.length, mappedFrames: mapped, remainingFrames: frames.length - mapped,
  mappedPercentage: mapped / frames.length * 100, routesExcludingLayouts: routes.length,
  duplicateTargetIds: targets.filter((target, index) => targets.findIndex((item) => item.nodeId === target.nodeId) !== index).map((target) => target.nodeId),
  unknownTargetIds: targets.filter((target) => !frames.some((frame) => frame.nodeId === target.nodeId)).map((target) => target.nodeId),
  missingMappedSources: frames.filter((frame) => frame.source && !frame.sourceExists).map((frame) => frame.source),
  missingMappedRoutes: frames.filter((frame) => frame.source && !frame.routeExists).map((frame) => frame.route),
  missingMappedRenders: frames.filter((frame) => frame.source && !frame.renderedExists).map((frame) => frame.nodeId),
  coverageMatchesTargets: coverage.totalFrames === frames.length && coverage.implemented === mapped && coverage.pending === frames.length - mapped && frames.every((frame) => {
    const saved = coverage.frames.find((item) => item.nodeId === frame.nodeId);
    return saved && (saved.implementation?.source ?? null) === frame.source && (saved.implementation?.route ?? null) === frame.route;
  }),
  savedEvidence: { withContext: frames.filter((frame) => frame.contextExists).length, withReference: frames.filter((frame) => frame.referenceExists).length, withRendered: frames.filter((frame) => frame.renderedExists).length },
  previousValidation: { file: 'docs/ui-progress-evidence-2026-10-30/news-landing-validation.json', checkedAt: previous.checkedAt, matchingHashes: sourceHashes.filter((entry) => entry.matchesPreviousEvidence).length, totalHashes: sourceHashes.length, sourceHashes },
  functionStatusCounts: previous.functionStatusCounts,
  functionStatuses: previous.functionStatuses,
  articleDetailPreparation: { frameIds: Object.keys(read('docs/figma-fidelity/news-detail-layout-source.json')), modules: preparation, countedAsCompleted: false },
  groups, frames,
};
fs.writeFileSync(path.join(__dirname, 'frame-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, frames: undefined, functionStatuses: undefined, previousValidation: { ...result.previousValidation, sourceHashes: undefined } }, null, 2));
if (result.missingMappedSources.length || result.missingMappedRoutes.length || result.duplicateTargetIds.length || result.unknownTargetIds.length || !result.coverageMatchesTargets) process.exitCode = 1;
