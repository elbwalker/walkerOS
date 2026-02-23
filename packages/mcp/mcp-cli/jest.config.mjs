import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|@modelcontextprotocol)/)',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@walkeros/cli$': '<rootDir>/../../cli/src/',
    '^@walkeros/cli/dev$': '<rootDir>/../../cli/src/dev',
  },
};

export default { ...baseConfig, ...config };
