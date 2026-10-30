const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const live = read('docs/ui-progress-evidence-2026-10-30/figma-live-inventory.json');
const previous = read('docs/figma-fidelity/coverage.json');
const targets = require('../../apps/mobile/scripts/fidelity-targets.cjs');
const catalog = fs.readFileSync(path.join(root, 'docs/figma-analysis/01-interface-catalog.md'), 'utf8');
const groups = {};
for (const line of catalog.split('\n')) {
  const match = line.match(/^\| \[(\d+:\d+)\].*?\| ([^|]+) \| (FRAME|[A-Z_]+) \| [^|]+ \| ([^|]+) \|/);
  if (match) groups[match[1]] = match[4].trim();
}
const exists = (name) => Boolean(name && fs.existsSync(path.join(root, name)));
const frames = live.children.filter((node) => node.type === 'FRAME').map((node) => {
  const old = previous.frames.find((frame) => frame.nodeId === node.id);
  const target = targets.find((item) => item.nodeId === node.id);
  const source = target ? `apps/mobile/${target.implementation}` : null;
  return {
    nodeId: node.id,
    name: node.name,
    group: groups[node.id] || 'Tin tức',
    newSinceSnapshot: !old,
    route: target?.route || null,
    source,
    sourceExists: exists(source),
    contextExists: exists(old?.context && `docs/figma-fidelity/${old.context}`),
    referenceExists: exists(old?.reference && `docs/figma-fidelity/${old.reference}`),
    renderedExists: exists(old?.rendered && `docs/figma-fidelity/${old.rendered}`),
    status: target && exists(source) ? 'mapped-awaiting-complete-visual-audit' : 'no-frame-specific-mapping',
  };
});
const totals = {};
for (const frame of frames) {
  const group = totals[frame.group] ||= { total: 0, mapped: 0, remaining: 0 };
  group.total++;
  group[frame.sourceExists ? 'mapped' : 'remaining']++;
}
const result = {
  checkedOn: '2026-10-30',
  scope: 'backuped 386:7053, top-level FRAME nodes only',
  liveTopLevelNodes: live.children.length,
  liveFrames: frames.length,
  oldSnapshotFrames: previous.totalFrames,
  mappedFrames: frames.filter((frame) => frame.sourceExists).length,
  remainingFrames: frames.filter((frame) => !frame.sourceExists).length,
  newFrames: frames.filter((frame) => frame.newSinceSnapshot).map(({ nodeId, name }) => ({ nodeId, name })),
  missingMappedSources: frames.filter((frame) => frame.source && !frame.sourceExists),
  historicalEvidence: {
    withContext: frames.filter((frame) => frame.contextExists).length,
    withReference: frames.filter((frame) => frame.referenceExists).length,
    withRendered: frames.filter((frame) => frame.renderedExists).length,
  },
  groups: totals,
  frames,
};
fs.writeFileSync(path.join(__dirname, 'frame-audit.json'), JSON.stringify(result, null, 2) + '\n');
const columns = ['nodeId', 'name', 'group', 'newSinceSnapshot', 'route', 'source', 'sourceExists', 'contextExists', 'referenceExists', 'renderedExists', 'status'];
const csv = [columns, ...frames.map((frame) => columns.map((column) => frame[column] ?? ''))]
  .map((row) => row.map((value) => '"' + String(value).replaceAll('"', '""') + '"').join(','))
  .join('\r\n');
fs.writeFileSync(path.join(__dirname, 'frame-audit.csv'), '\uFEFF' + csv + '\r\n');
console.log(JSON.stringify({ liveFrames: result.liveFrames, mappedFrames: result.mappedFrames, remainingFrames: result.remainingFrames, missingMappedSources: result.missingMappedSources, historicalEvidence: result.historicalEvidence, groups: result.groups }, null, 2));
