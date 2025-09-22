import nodeConfig from '@walkeros/jest/node.config.mjs';

export default {
  ...nodeConfig,
  displayName: '@walkeros/cli',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
  ],
  // Increase timeout for CLI tests that spawn processes
  testTimeout: 30000,
};