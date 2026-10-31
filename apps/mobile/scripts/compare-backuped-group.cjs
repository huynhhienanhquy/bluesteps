const fs = require('node:fs');
const path = require('node:path');
const group = process.argv[2];
if (!/^[a-z][a-z-]*$/.test(group ?? '')) throw Error('Invalid design group');
const sharp = require(
  process.argv.find((a) => a.startsWith('--sharp-module='))?.slice(15) || 'sharp',
);
const dir = path.resolve(__dirname, '../../../docs/figma-fidelity');
async function main() {
  const rows = [];
  for (const target of require('./fidelity-targets.cjs').filter((t) =>
    t.name.startsWith(group + '-'),
  )) {
    const ref = sharp(
      path.join(dir, 'reference', `${target.nodeId.replace(':', '-')}-${group}.png`),
    );
    const rendered = sharp(path.join(dir, 'rendered', `${target.name}-${target.width ?? 428}.png`));
    const m = await rendered.metadata();
    const [a, b] = await Promise.all([
      ref
        .resize(m.width, m.height, { fit: 'fill' })
        .flatten({ background: '#FFFFFF' })
        .removeAlpha()
        .raw()
        .toBuffer(),
      rendered.flatten({ background: '#FFFFFF' }).removeAlpha().raw().toBuffer(),
    ]);
    let sum = 0,
      count = 0;
    for (let i = 0; i < a.length; i++) {
      let d = Math.abs(a[i] - b[i]);
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
    path.join(dir, `${group}-visual-comparison.json`),
    JSON.stringify(
      {
        scope: `backuped ${group} frames at configured capture widths`,
        fullFidelityProven: false,
        notes:
          'Transparent reference pixels are composited on the white preview backdrop. Remaining full-frame differences include text and emoji rasterization. Asset geometry is audited separately.',
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
