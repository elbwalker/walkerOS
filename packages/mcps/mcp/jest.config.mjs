import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|@modelcontextprotocol|chalk|jsdom|parse5|nwsapi|entities|@exodus/bytes|@asamuzakjp|@bramus|@csstools|css-tree|tough-cookie|msw|until-async|rettime|@bundled-es-modules|@mswjs|@open-draft)/)',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@walkeros/cli/openapi/spec.json$':
      '<rootDir>/../../cli/openapi/spec.json',
    '^@walkeros/cli$': '<rootDir>/../../cli/src/',
    '^@walkeros/cli/dev$': '<rootDir>/../../cli/src/dev',
  },
};

export default { ...baseConfig, ...config };
