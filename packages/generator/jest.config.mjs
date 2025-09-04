import baseConfig from '@walkeros/jest';

export default {
  ...baseConfig,
  displayName: '@walkeros/generator',
  testTimeout: 30000, // 30 second timeout for tests that involve npm operations
  detectOpenHandles: true, // Detect hanging promises/handles
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'], // Integration and CLI tests
};