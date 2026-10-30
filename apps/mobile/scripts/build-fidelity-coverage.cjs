const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const source = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/figma-analysis/evidence/backuped-all.json'), 'utf8'),
);
const output = path.join(root, 'docs/figma-fidelity');
const implemented = Object.fromEntries(
  require('./fidelity-targets.cjs').map((target) => [
    target.nodeId,
    { route: target.route, source: target.implementation, render: target.name },
  ]),
);
const frames = source.screens
  .filter((screen) => screen.type === 'FRAME')
  .map((screen) => {
    const key = screen.id.replace(':', '-');
    const implementation = implemented[screen.id];
    return {
      nodeId: screen.id,
      name: screen.name,
      width: screen.w,
      height: screen.h,
      context: fs.existsSync(path.join(output, 'contexts', `${key}.txt`))
        ? `contexts/${key}.txt`
        : null,
      reference: fs.existsSync(path.join(output, 'reference', `${key}.png`))
        ? `reference/${key}.png`
        : null,
      implementation: implementation
        ? { ...implementation, source: `apps/mobile/${implementation.source}` }
        : null,
      rendered:
        implementation &&
        fs.existsSync(path.join(output, 'rendered', `${implementation.render}-428.png`))
          ? `rendered/${implementation.render}-428.png`
          : null,
      status: implementation ? 'implemented-awaiting-complete-visual-audit' : 'pending',
    };
  });
fs.writeFileSync(
  path.join(output, 'coverage.json'),
  JSON.stringify(
    {
      fileKey: source.fileKey,
      pageId: source.pageId,
      pageName: 'backuped',
      snapshotDate: source.capturedOn,
      goalStatus: 'active',
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
