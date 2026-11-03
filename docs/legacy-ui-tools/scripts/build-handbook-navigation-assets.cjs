const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const frames = ['386-13263', '386-13313', '386-13364', '386-13593', '386-13782', '386-13929'];
const names = [
  'imgRectangle87',
  'imgVector',
  'imgVector1',
  'imgVector2',
  'imgVector3',
  'imgVector4',
  'imgVector5',
  'imgVector6',
  'imgEllipse9',
  'imgVector7',
  'imgLine1',
];
const result = {};
for (const frame of frames) {
  const text = fs.readFileSync(
    path.join(root, 'docs/figma-fidelity/contexts', `${frame}.txt`),
    'utf8',
  );
  const offset = text.indexOf('w-[444px]');
  if (offset === -1) throw new Error(`Missing original navigation in ${frame}`);
  const sources = [...text.slice(offset).matchAll(/src=\{(img\w+)\}/g)]
    .slice(0, 11)
    .map((match) => match[1]);
  if (sources.length !== 11 || sources[0] !== 'imgRectangle87' || sources[10] !== 'imgLine1')
    throw new Error(`Unexpected navigation in ${frame}`);
  result[frame.replace('-', ':')] = {};
  const directory = path.join(root, 'apps/mobile/assets/figma', frame);
  fs.mkdirSync(directory, { recursive: true });
  sources.forEach((source, index) => {
    const url = text.match(
      new RegExp(`const ${source} = "(https://www\\.figma\\.com/api/mcp/asset/[\\w-]+\\.svg)";`),
    )?.[1];
    if (!url) throw new Error(`Missing SVG source ${frame}/${source}`);
    const destination = path.join(directory, `${source}.svg`);
    if (!fs.existsSync(destination))
      execFileSync('curl.exe', ['-f', '-L', '--silent', '--show-error', '-o', destination, url], {
        windowsHide: true,
      });
    if (!fs.statSync(destination).size) throw new Error(`Empty original asset ${destination}`);
    result[frame.replace('-', ':')][names[index]] = {
      source,
      file: `../../assets/figma/${frame}/${source}.svg`,
    };
  });
}
fs.writeFileSync(
  path.join(root, 'docs/figma-fidelity/handbook-navigation-source-map.json'),
  JSON.stringify(result, null, 2) + '\n',
);
fs.writeFileSync(
  path.join(root, 'apps/mobile/src/design-system/handbook-navigation-assets.ts'),
  'export const handbookNavigationAssets = {\n' +
    Object.entries(result)
      .map(
        ([frame, assets]) =>
          `  '${frame}': {\n` +
          Object.entries(assets)
            .map(([key, value]) => `    ${key}: require('${value.file}'),`)
            .join('\n') +
          '\n  },',
      )
      .join('\n') +
    '\n};\n',
);
console.log(`Prepared original navigation assets for ${frames.length} handbook frames.`);
