const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? files(target) : [target];
  });
}
const runtime = [...files(path.join(root, 'src')), ...files(path.join(root, 'app'))].filter(
  (file) => /\.tsx?$/.test(file) && !/\.test\./.test(file),
);
const forbidden = [
  /(?:from|import)\s*['"][^'"]*(?:fixtures|mock-session|demo-session|useDemoQuery)['"]/,
  /\b(?:readDemo|demoData|mockProfile|mockWallet|initialPosts|createDemoSession|resetDemo)\b/,
  /Linh Chi|Bạn · Demo|180 điểm|182 điểm|9:41/,
  /postgresql(?:\+psycopg)?:\/\//,
];
const violations = runtime.filter((file) =>
  forbidden.some((pattern) => pattern.test(fs.readFileSync(file, 'utf8'))),
);
for (const old of [
  'fixtures.ts',
  'demo.ts',
  'mock-session.ts',
  'demo-session.ts',
  'useDemoQuery.ts',
]) {
  const file = path.join(root, 'src/services', old);
  if (fs.existsSync(file)) violations.push(file);
}
for (const route of files(path.join(root, 'app')).filter(
  (file) => /\.tsx$/.test(file) && !/(_layout|\+not-found)\.tsx$/.test(file),
)) {
  const source = fs.readFileSync(route, 'utf8');
  const featureImports = [
    ...source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+[^;'"]*?\sfrom\s*['"]((?:\.\.\/)+src\/features\/[a-z][a-z0-9-]*\/[A-Za-z][A-Za-z0-9-]*)['"]/g,
    ),
  ];
  if (
    !featureImports.length ||
    featureImports.some((match) => {
      const target = path.resolve(path.dirname(route), match[1]);
      return !['.ts', '.tsx'].some((extension) => fs.existsSync(target + extension));
    })
  ) {
    violations.push(route);
  }
}
if (violations.length) {
  console.error(
    'Live-data audit failed:\n' +
      [...new Set(violations)].map((file) => path.relative(root, file)).join('\n'),
  );
  process.exit(1);
}
console.log(
  `Live-data source audit passed: ${runtime.length} runtime files; no fixture adapters, seeded identities or database credentials.`,
);
