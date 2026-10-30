const { readFileSync } = require('node:fs');
const font = readFileSync(
  require.resolve('@expo-google-fonts/poppins/300Light/Poppins_300Light.ttf'),
);
let cmap;
for (let i = 0; i < font.readUInt16BE(4); i++) {
  const table = 12 + i * 16;
  if (font.toString('ascii', table, table + 4) === 'cmap') cmap = font.readUInt32BE(table + 8);
}
const tables = [];
for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
  const entry = cmap + 4 + i * 8;
  const table = cmap + font.readUInt32BE(entry + 4);
  if (font.readUInt16BE(table) === 4) tables.push(table);
}
const supports = (character) =>
  tables.some((table) => {
    const code = character.codePointAt(0);
    const count = font.readUInt16BE(table + 6) / 2;
    const end = table + 14;
    const start = end + count * 2 + 2;
    const delta = start + count * 2;
    const range = delta + count * 2;
    for (let i = 0; i < count; i++) {
      if (code < font.readUInt16BE(start + i * 2) || code > font.readUInt16BE(end + i * 2))
        continue;
      const offset = font.readUInt16BE(range + i * 2);
      const glyph = offset
        ? font.readUInt16BE(range + i * 2 + offset + (code - font.readUInt16BE(start + i * 2)) * 2)
        : code;
      return glyph !== 0 && (glyph + font.readInt16BE(delta + i * 2)) % 65536 !== 0;
    }
    return false;
  });
const vietnamese =
  'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ';
console.log(
  JSON.stringify({
    unsupported: [...vietnamese].filter((character) => !supports(character)).join(''),
  }),
);
