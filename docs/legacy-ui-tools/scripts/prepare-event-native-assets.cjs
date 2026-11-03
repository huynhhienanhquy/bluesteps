const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Android's SVG decoder omits SVG filter effects. Rasterize the original vectors,
// including their original transparent filter bounds, instead of redrawing them.
// Pass --sharp-module=<bundled sharp path> when sharp is outside node resolution.
const rendererPath = process.argv.find((arg) => arg.startsWith('--sharp-module='))?.slice(15);
const sharp = require(rendererPath || 'sharp');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'apps/mobile');
const group = process.argv.find((arg) => arg.startsWith('--group='))?.slice(8) ?? 'event-detail';
if (!/^[a-z][a-z-]*$/.test(group)) throw new Error('Invalid asset group');
const exportName = group.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + 'Assets';
const map = JSON.parse(
  fs.readFileSync(path.join(root, `docs/figma-fidelity/${group}-asset-map.json`), 'utf8'),
);
const derivatives = [];
const digest = (data) => crypto.createHash('sha256').update(data).digest('hex');
async function main() {
  for (const [frame, assets] of Object.entries(map)) {
    for (const [key, source] of Object.entries(assets)) {
      if (!source.endsWith('.svg')) continue;
      const original = path.resolve(mobile, 'src/design-system', source);
      const bytes = fs.readFileSync(original);
      if (!bytes.toString().includes('filter=')) continue;
      const output = original.replace(/\.svg$/, '.native.png');
      const info = await sharp(bytes, { density: 216 }).png().toFile(output);
      derivatives.push({
        frame,
        key,
        original: path.relative(root, original).replaceAll('\\', '/'),
        output: path.relative(root, output).replaceAll('\\', '/'),
        originalSha256: digest(bytes),
        outputSha256: digest(fs.readFileSync(output)),
        width: info.width,
        height: info.height,
      });
      assets[key] = source.replace(/\.svg$/, '.native.png');
    }
  }
  fs.writeFileSync(
    path.join(mobile, `src/design-system/${group}-assets.ts`),
    '// Original Figma assets; SVG filters use transparent 3x PNG derivatives for native decoders.\n' +
      `export const ${exportName} = {\n` +
      Object.entries(map)
        .map(
          ([frame, assets]) =>
            `  '${frame}': {\n` +
            Object.entries(assets)
              .map(([key, source]) => `    ${key}: require('${source}'),`)
              .join('\n') +
            '\n  },',
        )
        .join('\n') +
      '\n};\n',
  );
  fs.writeFileSync(
    path.join(root, `docs/figma-fidelity/${group}-native-derivatives.json`),
    JSON.stringify(
      {
        renderer: `sharp ${sharp.versions.sharp} / librsvg ${sharp.versions.rsvg}`,
        density: 216,
        scale: 3,
        derivatives,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ derivatives: derivatives.length, originalVectorsRetained: true }));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
