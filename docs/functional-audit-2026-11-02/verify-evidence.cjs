const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const matrix = read('frame-matrix.json');
const summary = read('summary.json');
const routes = read('runtime/runtime-routes.json');
const fingerprints = read('source-fingerprints.json');
const missingScreenshots = routes.filter((route) => !fs.existsSync(path.join(__dirname, 'runtime', route.screenshot))).map((route) => route.screenshot);
const staleSources = [...fingerprints.files, ...fingerprints.routes, ...fingerprints.api].filter((file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file.file))).digest('hex') !== file.sha256).map((file) => file.file);
const brokenLinks = [...fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8').matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).filter((target) => !/^https?:/.test(target) && !fs.existsSync(path.resolve(__dirname, target.split('#')[0])));
const result = {
  checkedAt: new Date().toISOString(),
  frames: matrix.frames.length,
  uniqueFrames: new Set(matrix.frames.map((frame) => frame.id)).size,
  reviewedFrames: matrix.frames.filter((frame) => frame.reviewedFunctionality).length,
  otherFrames: summary.otherFrames,
  routes: routes.length,
  tests: summary.tests.length,
  passedTests: summary.tests.filter((test) => test.status === 'passed').length,
  missingScreenshots,
  staleSources,
  brokenLinks,
};
result.passed = result.frames === 211 && result.uniqueFrames === 211 && result.reviewedFrames === 211 && result.otherFrames === 201 && result.routes === 66 && result.tests === 15 && result.passedTests === 15 && !missingScreenshots.length && !staleSources.length && !brokenLinks.length;
fs.writeFileSync(path.join(__dirname, 'evidence-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
