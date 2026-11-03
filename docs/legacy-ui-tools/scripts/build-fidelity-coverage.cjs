const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const source = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/figma-analysis/evidence/backuped-all.json'), 'utf8'),
);
const output = path.join(root, 'docs/figma-fidelity');
const inventoryPath = [
  'docs/ui-progress-evidence-2026-10-31/figma-live-inventory-final.json',
  'docs/ui-progress-evidence-2026-10-31/figma-live-inventory-1031.json',
  'docs/ui-progress-evidence-2026-10-30/figma-live-inventory.json',
]
  .map((file) => path.join(root, file))
  .find((file) => fs.existsSync(file));
const inventory = inventoryPath ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) : null;
if (inventory && inventory.pageId !== '386:7053')
  throw new Error('Only the backuped page (386:7053) is in scope.');
const savedScreens = new Map(source.screens.map((screen) => [screen.id, screen]));
const screens = inventory
  ? inventory.children.map((node) => {
      const previous = savedScreens.get(node.id);
      const reference = path.join(output, 'reference', `${node.id.replace(':', '-')}.png`);
      const png = !previous && fs.existsSync(reference) ? fs.readFileSync(reference) : null;
      return {
        ...previous,
        ...node,
        w: node.width ?? previous?.w ?? (png ? png.readUInt32BE(16) : null),
        h: node.height ?? previous?.h ?? (png ? png.readUInt32BE(20) : null),
      };
    })
  : source.screens;
const implemented = Object.fromEntries(
  require('./fidelity-targets.cjs').map((target) => [
    target.nodeId,
    {
      route: target.route,
      source: target.implementation,
      render: target.name,
      ...(target.width ? { renderWidth: target.width } : {}),
    },
  ]),
);
if (inventory) {
  const liveFrames = new Set(
    inventory.children.filter((node) => node.type === 'FRAME').map((node) => node.id),
  );
  for (const nodeId of Object.keys(implemented))
    if (!liveFrames.has(nodeId))
      throw new Error(`Mapped frame is outside the current backuped page: ${nodeId}`);
}
const frames = screens
  .filter((screen) => screen.type === 'FRAME')
  .map((screen) => {
    const key = screen.id.replace(':', '-');
    const implementation = implemented[screen.id];
    const context = [
      `contexts/${key}-final.txt`,
      `contexts/${key}-bot.txt`,
      `contexts/${key}-chat.txt`,
      `contexts/${key}-composer.txt`,
      `contexts/${key}-community.txt`,
      `contexts/${key}-notifications.txt`,
      `contexts/${key}-rewards.txt`,
      `contexts/${key}.txt`,
    ].find((file) => fs.existsSync(path.join(output, file)));
    const reference = [
      `reference/${key}-final.png`,
      `reference/${key}-bot.png`,
      `reference/${key}-chat.png`,
      `reference/${key}-composer.png`,
      `reference/${key}-community.png`,
      `reference/${key}-notifications.png`,
      `reference/${key}-rewards.png`,
      `reference/${key}.png`,
    ].find((file) => fs.existsSync(path.join(output, file)));
    return {
      nodeId: screen.id,
      name: screen.name,
      width: screen.w,
      height: screen.h,
      context: context ?? null,
      reference: reference ?? null,
      implementation: implementation
        ? { ...implementation, source: `apps/mobile/${implementation.source}` }
        : null,
      rendered:
        implementation &&
        fs.existsSync(
          path.join(
            output,
            'rendered',
            `${implementation.render}-${implementation.renderWidth ?? 428}.png`,
          ),
        )
          ? `rendered/${implementation.render}-${implementation.renderWidth ?? 428}.png`
          : null,
      status: implementation ? 'implemented' : 'pending',
    };
  });
const evidenceComplete = frames.every(
  (f) =>
    f.implementation &&
    f.context &&
    f.reference &&
    f.rendered &&
    [
      f.implementation.source,
      path.join('docs/figma-fidelity', f.context),
      path.join('docs/figma-fidelity', f.reference),
      path.join('docs/figma-fidelity', f.rendered),
    ].every(
      (file) => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size > 0,
    ),
);
fs.writeFileSync(
  path.join(output, 'coverage.json'),
  JSON.stringify(
    {
      fileKey: source.fileKey,
      pageId: source.pageId,
      pageName: 'backuped',
      snapshotDate: inventory?.checkedOn ?? inventory?.capturedOn ?? source.capturedOn,
      inventory: inventoryPath ? path.relative(root, inventoryPath).replaceAll('\\', '/') : null,
      uiCodeEvidenceComplete: evidenceComplete,
      fullFidelityProven: false,
      totalFrames: frames.length,
      implemented: frames.filter((frame) => frame.implementation).length,
      pending: frames.filter((frame) => !frame.implementation).length,
      frames,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    totalFrames: frames.length,
    implemented: Object.keys(implemented).length,
    pending: frames.length - Object.keys(implemented).length,
  }),
);
