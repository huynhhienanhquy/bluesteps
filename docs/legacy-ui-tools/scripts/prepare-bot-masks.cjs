const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(
  process.argv.find((a) => a.startsWith('--sharp-module='))?.slice(15) || 'sharp',
);
const mobile = path.resolve(__dirname, '..'),
  dir = path.resolve(mobile, '../../docs/figma-fidelity');
const dataFile = path.join(mobile, 'src/features/assistant/bot-design-data.json');
const mapFile = path.join(dir, 'bot-asset-map.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')),
  assets = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const rows = [];
const digest = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function main() {
  for (const [frame, f] of Object.entries(data))
    for (const [index, l] of f.layers.entries()) {
      if (!l.mask || l.mask.applied) continue;
      const imageFile = path.resolve(mobile, 'src/design-system', assets[frame][l.key]);
      const maskFile = path.resolve(mobile, 'src/design-system', assets[frame][l.mask.key]);
      const scale = 3,
        width = Math.max(1, Math.round(l.w * scale)),
        height = Math.max(1, Math.round(l.h * scale));
      const mw = Math.max(1, Math.round(l.mask.w * scale)),
        mh = Math.max(1, Math.round(l.mask.h * scale));
      const dx = Math.round((l.mask.x - l.x) * scale),
        dy = Math.round((l.mask.y - l.y) * scale);
      const left = Math.max(0, -dx),
        top = Math.max(0, -dy),
        outX = Math.max(0, dx),
        outY = Math.max(0, dy);
      const cropW = Math.min(mw - left, width - outX),
        cropH = Math.min(mh - top, height - outY);
      const renderedMask = await sharp(maskFile, { density: 216 })
        .resize(mw, mh, { fit: 'fill' })
        .png()
        .toBuffer();
      const cropped =
        cropW > 0 && cropH > 0
          ? await sharp(renderedMask)
              .extract({ left, top, width: cropW, height: cropH })
              .png()
              .toBuffer()
          : null;
      let maskCanvas = sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      });
      if (cropped) maskCanvas = maskCanvas.composite([{ input: cropped, left: outX, top: outY }]);
      const alpha = await maskCanvas.png().toBuffer();
      const target = path.join(
        mobile,
        `assets/figma/bot/${frame.replace(':', '-')}/masked-${index}.png`,
      );
      await sharp(imageFile, { density: 216 })
        .resize(width, height, { fit: 'fill' })
        .composite([{ input: alpha, blend: 'dest-in' }])
        .png()
        .toFile(target);
      const key = 'maskedImage' + index;
      assets[frame][key] = '../../' + path.relative(mobile, target).replaceAll('\\', '/');
      rows.push({
        frame,
        node: l.id,
        source: path.relative(mobile, imageFile),
        sourceSha256: digest(imageFile),
        mask: path.relative(mobile, maskFile),
        maskSha256: digest(maskFile),
        target: path.relative(mobile, target),
        targetSha256: digest(target),
        scale,
        sourceKey: l.key,
        bounds: [l.x, l.y, l.w, l.h],
        maskBounds: l.mask,
      });
      l.key = key;
      l.mask.applied = true;
    }
  fs.writeFileSync(dataFile, JSON.stringify(data) + '\n');
  fs.writeFileSync(mapFile, JSON.stringify(assets, null, 2) + '\n');
  fs.writeFileSync(
    path.join(dir, 'bot-mask-derivatives.json'),
    JSON.stringify(
      {
        purpose: 'Rasterize original SVG alpha masks without altering source assets',
        scale: 3,
        rows,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ maskedLayers: rows.length, originalAssetsRetained: true }));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
