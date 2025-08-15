import baseConfig from '@walkeros/jest/web.config.mjs';

export default {
  ...baseConfig,
  displayName: 'explorer',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src.backup/',
    '/.turbo/'
  ],
  modulePathIgnorePatterns: [
    '/src.backup/'
  ]
};