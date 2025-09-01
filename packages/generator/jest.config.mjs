import baseConfig from '@walkeros/jest';

export default {
  ...baseConfig,
  displayName: '@walkeros/generator',
  testTimeout: 10000, // 10 second timeout for tests
  detectOpenHandles: true, // Detect hanging promises/handles
};