const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packageRoot = path.dirname(require.resolve('maplibre-gl/package.json'));
const directory = path.join(root, 'assets/vendor');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(
  path.join(directory, 'maplibre.json'),
  JSON.stringify({
    version: require(path.join(packageRoot, 'package.json')).version,
    js: fs.readFileSync(path.join(packageRoot, 'dist/maplibre-gl.js'), 'utf8'),
    css: fs.readFileSync(path.join(packageRoot, 'dist/maplibre-gl.css'), 'utf8'),
  }),
);
fs.copyFileSync(
  path.join(packageRoot, 'LICENSE.txt'),
  path.join(directory, 'maplibre-LICENSE.txt'),
);
console.log('Bundled MapLibre JS/CSS and license for the local map document.');
