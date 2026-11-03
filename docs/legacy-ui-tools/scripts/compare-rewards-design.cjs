const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.argv.find((a) => a.startsWith('--sharp-module='))?.slice(15) || 'sharp',
);
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
const targets = require('./fidelity-targets.cjs').filter((t) => t.name.startsWith('rewards-'));
async function main() {
  const rows = [];
  for (const target of targets) {
    const key = target.nodeId.replace(':', '-');
    const ref = sharp(path.join(dir, 'reference', `${key}-rewards.png`));
    const rendered = sharp(path.join(dir, 'rendered', `${target.name}-428.png`));
    const m = await rendered.metadata();
    const [a, b] = await Promise.all([
      ref.resize(m.width, m.height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
      rendered.removeAlpha().raw().toBuffer(),
    ]);
    let sum = 0,
      count = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      sum += d;
      if (d > 20) count++;
    }
    rows.push({
      frame: target.nodeId,
      name: target.name,
      width: m.width,
      height: m.height,
      meanAbsoluteChannelDifference: sum / a.length,
      channelsDifferingByMoreThan20Percent: (count / a.length) * 100,
    });
  }
  fs.writeFileSync(
    path.join(dir, 'rewards-visual-comparison.json'),
    JSON.stringify(
      {
        scope: '17 backuped reward frames at 428px',
        fullFidelityProven: false,
        notes:
          'Pixel differences remain, including font rasterization, emoji and small text/crop differences. Asset slot geometry is checked separately.',
        rows,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      frames: rows.length,
      minMean: Math.min(...rows.map((r) => r.meanAbsoluteChannelDifference)),
      maxMean: Math.max(...rows.map((r) => r.meanAbsoluteChannelDifference)),
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
