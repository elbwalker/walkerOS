import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  testTimeout: 30000,
  // Transform ESM packages: jsdom 27+ and its dependencies are pure ESM
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|chalk|jsdom|parse5|nwsapi|entities)/)',
  ],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '\\.tmp',
  ],
  // CLI-specific: Fix Jest + pacote + spdx-* CJS/JSON resolution
  // pacote (used for npm package downloads) has a deep CJS dependency chain that
  // requires spdx-license-ids and spdx-exceptions JSON modules, which Jest cannot resolve by default
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // ESM: Map .js imports to .ts files for Jest (TypeScript source files use .js extensions for Node.js ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^spdx-license-ids$':
      '<rootDir>/../../node_modules/spdx-license-ids/index.json',
    '^spdx-license-ids/deprecated$':
      '<rootDir>/../../node_modules/spdx-license-ids/deprecated.json',
    '^spdx-exceptions$':
      '<rootDir>/../../node_modules/spdx-exceptions/index.json',
  },
};

export default { ...baseConfig, ...config };