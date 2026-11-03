const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const evidence = path.join(root, 'docs/ui-progress-evidence-2026-10-31');
const folder = path.join(evidence, 'native-events');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const report = read(path.join(folder, 'qa-report.json'));
assert.equal(report.results.length, 7, 'The complete native activity suite is required');
assert(
  report.results.every((result) => result.passed),
  'Native activity suite has failures',
);
const runtime = fs.readFileSync(path.join(folder, 'qa-runtime.log'), 'utf8');
assert(
  !runtime.split(/\r?\n/).some((line) => line.trim() && !line.startsWith('---------')),
  'Inspect native runtime errors before accepting evidence',
);
const layouts = read(path.join(root, 'docs/figma-fidelity/event-detail-layout-source.json'));
const rows = Object.entries(layouts).map(([nodeId, design]) => ({
  nodeId,
  route: `/events/${design.eventId}?preview=1${design.interested ? '&interested=1' : ''}`,
  source: 'apps/mobile/src/features/events/EventDetailDesignScreen.tsx',
  name: `qa-event-${nodeId.replace(':', '-')}`,
}));
rows.push(
  {
    nodeId: '386:18069',
    route: '/saved?preview=1',
    source: 'apps/mobile/src/features/events/SavedEventScreens.tsx',
    name: 'qa-event-386-18069',
  },
  {
    nodeId: '386:10122',
    route: '/events/green-class',
    preparation: 'Quan tâm, then Lưu hoạt động',
    source: 'apps/mobile/src/features/events/EventSavedFeedback.tsx',
    name: 'qa-event-386-10122',
  },
  {
    nodeId: '386:10131',
    route: '/saved',
    preparation: 'Xóa Giờ học xanh, then Xác nhận xóa',
    source: 'apps/mobile/src/features/events/EventSavedFeedback.tsx',
    name: 'qa-event-386-10131',
  },
);
const sourceMapFile = path.join(root, 'docs/figma-fidelity/android-ui-source-map.json');
const sourceMap = read(sourceMapFile);
const nodeIds = new Set(rows.map((row) => row.nodeId));
sourceMap.frames = sourceMap.frames.filter((row) => !nodeIds.has(row.nodeId));
for (const { name, ...row } of rows) {
  assert(report.screenshots.includes(name), `Not captured in this passed run: ${name}`);
  for (const extension of ['png', 'xml'])
    assert(fs.statSync(path.join(folder, `${name}.${extension}`)).size > 0);
  sourceMap.frames.push({
    ...row,
    pageId: '386:7053',
    checkedAt: report.checkedAt,
    png: `docs/ui-progress-evidence-2026-10-31/native-events/${name}.png`,
    uiTree: `docs/ui-progress-evidence-2026-10-31/native-events/${name}.xml`,
    captureScope: 'native viewport, not complete Figma frame',
    fullFidelityAccepted: false,
  });
}
sourceMap.checkedAt = report.checkedAt;
const copyFile = path.join(evidence, 'native-event-copy/qa-report.json');
let copyVerification;
if (fs.existsSync(copyFile)) {
  const copy = read(copyFile);
  assert.equal(copy.results.length, 2, 'Both native copy/font follow-ups are required');
  assert(
    copy.results.every((result) => result.passed),
    'Native copy follow-up has failures',
  );
  const copyRuntime = fs.readFileSync(
    path.join(evidence, 'native-event-copy/qa-runtime.log'),
    'utf8',
  );
  assert(
    !copyRuntime.split(/\r?\n/).some((line) => line.trim() && !line.startsWith('---------')),
    'Native copy follow-up has runtime errors',
  );
  copyVerification = {
    checkedAt: copy.checkedAt,
    groups: 2,
    screenshots: copy.screenshots.length,
    report: 'native-event-copy/qa-report.json',
    runtimeErrors: 0,
  };
  for (const nodeId of ['386:10026', '386:17299'])
    sourceMap.frames.find((row) => row.nodeId === nodeId).textFollowUp = copyVerification;
}
const opacityCaptures = [
  ['386:10026', 'qa-event-garden-opacity50'],
  ['386:17299', 'qa-event-garden-interested-opacity50'],
];
const opacityVerification = [];
for (const [nodeId, name] of opacityCaptures) {
  if (!fs.existsSync(path.join(folder, `${name}.png`))) continue;
  assert(fs.statSync(path.join(folder, `${name}.xml`)).size > 0);
  assert.equal(layouts[nodeId].hero.find((image) => image.key === 'imgRectangle753').opacity, 0.5);
  const followUp = {
    nodeId,
    sourceOpacity: 0.5,
    visuallyReviewed: true,
    png: `docs/ui-progress-evidence-2026-10-31/native-events/${name}.png`,
    uiTree: `docs/ui-progress-evidence-2026-10-31/native-events/${name}.xml`,
    captureScope: 'native viewport; thumbnail overlay follow-up only',
  };
  opacityVerification.push(followUp);
  sourceMap.frames.find((row) => row.nodeId === nodeId).opacityFollowUp = followUp;
}
fs.writeFileSync(sourceMapFile, JSON.stringify(sourceMap, null, 2) + '\n');
const validation = {
  checkedAt: report.checkedAt,
  sourcePage: { id: '386:7053', name: 'backuped' },
  nativeQa: {
    passed: true,
    groups: report.results.length,
    screenshots: report.screenshots.length,
    runtimeErrors: 0,
    report: 'native-events/qa-report.json',
  },
  detailFrames: Object.keys(layouts),
  extraFrames: ['386:18069', '386:10122', '386:10131'],
  fullFidelityAccepted: false,
  copyVerification,
  opacityVerification,
  limitations: report.limitations,
};
fs.writeFileSync(
  path.join(evidence, 'event-detail-native-validation.json'),
  JSON.stringify(validation, null, 2) + '\n',
);
console.log(JSON.stringify(validation, null, 2));
