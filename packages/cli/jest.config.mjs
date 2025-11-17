import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  testTimeout: 30000,
  transformIgnorePatterns: ['/node_modules/(?!(@walkeros|chalk)/)'],
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns || []),
    '\\.tmp',
  ],
  // CLI-specific: Fix Jest + pacote + spdx-* CJS/JSON resolution
  // pacote (used for npm package downloads) has a deep CJS dependency chain that
  // requires spdx-license-ids and spdx-exceptions JSON modules, which Jest cannot resolve by default
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^spdx-license-ids$':
      '<rootDir>/../../node_modules/spdx-license-ids/index.json',
    '^spdx-license-ids/deprecated$':
      '<rootDir>/../../node_modules/spdx-license-ids/deprecated.json',
    '^spdx-exceptions$':
      '<rootDir>/../../node_modules/spdx-exceptions/index.json',
  },
};

export default { ...baseConfig, ...config };