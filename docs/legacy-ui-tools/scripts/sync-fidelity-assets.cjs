const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const args = process.argv.slice(2);
const groupFlag = args.find((arg) => arg.startsWith('--group='));
const group = groupFlag?.slice(8) ?? 'collection-navigation';
if (!/^[a-z][a-z-]*$/.test(group)) throw new Error('Invalid asset group.');
const exportName = group.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + 'Assets';
const ids = args.filter((arg) => arg !== groupFlag);
if (!ids.length || ids.some((id) => !/^\d+-\d+$/.test(id)))
  throw new Error('Pass Figma node IDs as 123-456.');
const mapFile = resolve(__dirname, `../../../docs/figma-fidelity/${group}-asset-map.json`);
const maps = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
for (const id of ids) {
  const source = readFileSync(
    resolve(__dirname, '../../../docs/figma-fidelity/contexts', `${id}.txt`),
    'utf8',
  );
  const output = resolve(__dirname, '../assets/figma', id);
  mkdirSync(output, { recursive: true });
  maps[id.replace('-', ':')] = {};
  for (const [, key, url, extension] of source.matchAll(
    /const (img\w+) = "(https:\/\/www\.figma\.com\/api\/mcp\/asset\/[\w-]+\.(png|svg|jpg))";/g,
  )) {
    const name = `${key}.${extension}`;
    const destination = resolve(output, name);
    if (!existsSync(destination))
      execFileSync('curl.exe', ['-f', '-L', '--silent', '--show-error', '-o', destination, url], {
        windowsHide: true,
      });
    maps[id.replace('-', ':')][key] = `../../assets/figma/${id}/${name}`;
  }
  console.log(`${id}: ${Object.keys(maps[id.replace('-', ':')]).length} assets`);
}
writeFileSync(mapFile, JSON.stringify(maps, null, 2) + '\n');
writeFileSync(
  resolve(__dirname, `../src/design-system/${group}-assets.ts`),
  'export const ' +
    exportName +
    ' = {\n' +
    Object.entries(maps)
      .map(
        ([id, assets]) =>
          `  '${id}': {\n` +
          Object.entries(assets)
            .map(([key, file]) => `    ${key}: require('${file}'),`)
            .join('\n') +
          '\n  },',
      )
      .join('\n') +
    '\n};\n',
);
