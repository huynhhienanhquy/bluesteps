const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'docs/figma-fidelity');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const coverage = read(path.join(dir, 'coverage.json'));
const inventory = read(path.join(root, coverage.inventory));
const targets = require('./fidelity-targets.cjs');
const failures = [],
  sourceFiles = new Set(),
  assetFiles = new Set();
const live = new Set(inventory.children.filter((n) => n.type === 'FRAME').map((n) => n.id));
if (new Set(targets.map((t) => t.nodeId)).size !== targets.length)
  failures.push('Duplicate target IDs');
if (targets.length !== live.size) failures.push('Live frame and target counts differ');
function nonempty(file, label) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).size) {
    failures.push(label);
    return false;
  }
  return true;
}
for (const frame of coverage.frames) {
  if (!live.has(frame.nodeId)) failures.push('Outside backuped: ' + frame.nodeId);
  const source = frame.implementation?.source;
  if (source && nonempty(path.join(root, source), frame.nodeId + ': source'))
    sourceFiles.add(source);
  else if (!source) failures.push(frame.nodeId + ': no implementation');
  for (const key of ['context', 'reference', 'rendered']) {
    const file = frame[key] && path.join(dir, frame[key]);
    if (!nonempty(file, frame.nodeId + ': ' + key)) continue;
    const bytes = fs.readFileSync(file);
    if (key === 'context' && bytes.toString().includes('tool call error'))
      failures.push(frame.nodeId + ': failed context');
    if (
      key !== 'context' &&
      (bytes.length < 24 ||
        bytes.readUInt32BE(0) !== 0x89504e47 ||
        !bytes.readUInt32BE(16) ||
        !bytes.readUInt32BE(20))
    )
      failures.push(frame.nodeId + ': invalid PNG ' + key);
  }
}
const modules = path.join(root, 'apps/mobile/src/design-system');
for (const module of fs.readdirSync(modules).filter((file) => file.endsWith('assets.ts'))) {
  const code = fs.readFileSync(path.join(modules, module), 'utf8');
  for (const match of code.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    if (!match[1].startsWith('.')) continue;
    const file = path.resolve(modules, match[1]);
    if (nonempty(file, module + ': asset ' + match[1])) assetFiles.add(file);
  }
}
const finalAudit = read(path.join(dir, 'final-asset-audit.json'));
if (finalAudit.failures || finalAudit.runtimeErrors.length)
  failures.push('Final asset audit failed');
const extraCaptures = read(path.join(dir, 'rendered/capture-report-missing.json'));
if (
  extraCaptures.errors.length ||
  extraCaptures.results.some((r) => r.overflow || r.images.some((i) => !i.loaded))
)
  failures.push('Completion captures failed');
const report = {
  checkedOn: '2026-10-31',
  pageId: '386:7053',
  pageName: 'backuped',
  scope:
    'UI code, local assets, source/context/reference/render coverage. Backend and deployment are outside the requested scope.',
  liveFrames: live.size,
  implementedFrames: coverage.frames.filter((f) => f.implementation).length,
  framesWithSourceContextReferenceAndRender:
    coverage.frames.length -
    coverage.frames.filter((f) => !f.implementation || !f.context || !f.reference || !f.rendered)
      .length,
  sourceFiles: sourceFiles.size,
  nonemptyLocalAssetFiles: assetFiles.size,
  finalGroup: {
    frames: 14,
    captures: finalAudit.captures,
    imageSlots: finalAudit.slots,
    assetFailures: finalAudit.failures,
    maxSlotDeltaCssPx: finalAudit.maxDelta,
  },
  completionCaptures: extraCaptures.results.length,
  uiCodeComplete: failures.length === 0,
  fullPixelFidelityProven: false,
  limitations: [
    'Text and platform rasterization can differ from Figma.',
    'Web and native JS/Hermes bundles are checked; this report does not claim APK/IPA or physical-device acceptance.',
  ],
  failures,
};
fs.writeFileSync(
  path.join(dir, 'ui-code-completion-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
if (failures.length) process.exitCode = 1;
