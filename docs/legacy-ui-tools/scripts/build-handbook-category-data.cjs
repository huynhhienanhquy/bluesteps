const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../docs/figma-fidelity');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const assets = read('handbook-category-asset-map.json');
const gestureColor = (frame) => {
  for (const file of Object.values(assets[frame])) {
    if (!file.endsWith('.svg')) continue;
    const svg = fs.readFileSync(path.resolve(__dirname, '../src/design-system', file), 'utf8');
    if (svg.includes('width="141"') && svg.includes('height="2.56"'))
      return svg.match(/stroke="([^"]+)"/)?.[1] ?? '#000000';
  }
  return '#000000';
};
const addMedia = (frame, values) =>
  values.map((value) => ({ ...value, svg: assets[frame][value.source].endsWith('.svg') }));
const result = {};
for (const [category, base, expanded] of [
  ['inorganic', '386-13593', '386-13685'],
  ['organic', '386-13782', '386-13838'],
  ['recycle', '386-13929', '386-14037'],
]) {
  const geometry = read(`handbook-category-${base}-geometry.json`);
  const shell = read(`handbook-category-${base}-shell.json`);
  const popup = read(`handbook-category-${expanded}-popup.json`);
  geometry.rows = geometry.rows.map((row) => ({
    ...row,
    images: addMedia(geometry.id, row.images),
  }));
  shell.images = addMedia(shell.id, shell.images);
  popup.images = addMedia(popup.id, popup.images);
  popup.gestureColor = gestureColor(popup.id);
  result[category] = { ...geometry, gestureColor: gestureColor(geometry.id), shell, popup };
}
fs.writeFileSync(
  path.resolve(__dirname, '../src/features/handbook/handbook-category-data.ts'),
  'export const handbookCategoryData = ' + JSON.stringify(result, null, 2) + ' as const;\n',
);
console.log('Prepared original geometry for 3 category lists and 3 instruction panels.');
