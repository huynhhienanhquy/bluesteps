module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm|(?:jest-)?react-native|@react-native|expo|@expo|@react-navigation|@bluesteps)',
  ],
};
