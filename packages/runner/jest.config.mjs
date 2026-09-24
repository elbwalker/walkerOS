import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  testTimeout: 30000,
  // chalk is pure ESM; @walkeros packages resolve to their TypeScript source.
  transformIgnorePatterns: ['node_modules/(?!(@walkeros|chalk)/)'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // ESM: map .js imports to .ts files (sources use .js extensions for Node ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default { ...baseConfig, ...config };
