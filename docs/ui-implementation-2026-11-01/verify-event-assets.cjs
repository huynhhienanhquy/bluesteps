const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../apps/mobile/src/design-system/event-flow-artwork.ts');
const assets = [];
for (const match of fs.readFileSync(source, 'utf8').matchAll(/(\w+): require\('([^']+)'\)/g)) {
  const file = path.resolve(path.dirname(source), match[2]);
  const bytes = fs.statSync(file).size;
  if (!bytes) throw new Error('Empty asset ' + match[1]);
  let width, height;
  if (file.endsWith('.png')) {
    const header = Buffer.alloc(24), handle = fs.openSync(file, 'r');
    fs.readSync(handle, header, 0, 24, 0); fs.closeSync(handle);
    width = header.readUInt32BE(16); height = header.readUInt32BE(20);
  } else {
    const root = fs.readFileSync(file, 'utf8').match(/<svg\b[^>]*>/)?.[0] ?? '';
    width = root.match(/\bwidth="([^"]+)"/)?.[1]; height = root.match(/\bheight="([^"]+)"/)?.[1];
  }
  assets.push({ name: match[1], file: path.relative(path.resolve(__dirname, '../..'), file).replaceAll('\\', '/'), bytes, width, height });
}
fs.writeFileSync(__dirname + '/event-assets.json', JSON.stringify({ assets, note: 'Original vectors, logos and native derivatives; personal photos and published media are dynamic. Effective geometry must also be inspected in screenshots.' }, null, 2));
console.log('Verified ' + assets.length + ' non-empty event assets');
