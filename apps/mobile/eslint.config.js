const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'dist-native/**', 'coverage/**', '.expo/**', 'test-results/**'] },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
    languageOptions: { globals: { jest: 'readonly', test: 'readonly', expect: 'readonly' } },
  },
  { files: ['scripts/*.cjs'], languageOptions: { globals: { __dirname: 'readonly' } } },
]);
