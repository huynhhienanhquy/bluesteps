const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../apps/mobile/src/design-system/reward-artwork.ts');
const entries = [];
for (const match of fs.readFileSync(source, 'utf8').matchAll(/(\w+): require\('([^']+)'\)/g)) {
  const file = path.resolve(path.dirname(source), match[2]);
  const stat = fs.statSync(file);
  if (!stat.size) throw new Error(`Empty asset: ${match[1]}`);
  let width, height;
  if (file.endsWith('.png')) {
    const handle = fs.openSync(file, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(handle, header, 0, 24, 0);
    fs.closeSync(handle);
    width = header.readUInt32BE(16); height = header.readUInt32BE(20);
  } else {
    const root = fs.readFileSync(file, 'utf8').match(/<svg\b[^>]*>/)?.[0] ?? '';
    width = root.match(/\bwidth="([^"]+)"/)?.[1]; height = root.match(/\bheight="([^"]+)"/)?.[1];
  }
  entries.push({ name: match[1], file: path.relative(path.resolve(__dirname, '../..'), file).replaceAll('\\', '/'), bytes: stat.size, width, height });
}
fs.writeFileSync(__dirname + '/reward-assets.json', JSON.stringify({ source: 'curated original Figma assets; rendered geometry is recorded separately in visual checks', assets: entries }, null, 2));
console.log(`Verified ${entries.length} non-empty assets and intrinsic dimensions`);
