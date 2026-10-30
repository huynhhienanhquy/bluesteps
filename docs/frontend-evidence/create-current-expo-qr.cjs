const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { toQR } = require('../../node_modules/.pnpm/toqr@0.1.1/node_modules/toqr');
const url = process.argv[2];
if (!url || !/^exps?:\/\//.test(url)) throw new Error('Expected an Expo URL');
const matrix = toQR(url);
const modules = Math.sqrt(matrix.length);
if (!Number.isInteger(modules)) throw new Error('Unexpected QR matrix size');
const scale = 10;
const quiet = 4;
const size = (modules + quiet * 2) * scale;
const raw = Buffer.alloc((size + 1) * size, 255);
for (let y = 0; y < size; y++) {
  raw[y * (size + 1)] = 0;
  for (let x = 0; x < size; x++) {
    const mx = Math.floor(x / scale) - quiet;
    const my = Math.floor(y / scale) - quiet;
    const dark = mx >= 0 && my >= 0 && mx < modules && my < modules && matrix[my * modules + mx];
    raw[y * (size + 1) + x + 1] = dark ? 0 : 255;
  }
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 0;
const output = path.join(__dirname, 'expo-go-current-qr.png');
fs.writeFileSync(output, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
fs.writeFileSync(path.join(__dirname, 'expo-go-current-session.json'), JSON.stringify({ url, sdk: '58.0.0', generatedAt: new Date().toISOString(), qr: output, localBundlesVerified: ['ios', 'android'] }, null, 2) + '\n');
console.log(JSON.stringify({ output, size, url }));
