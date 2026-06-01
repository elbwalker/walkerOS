import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  // jsdom and large parts of its dependency tree ship as pure ESM and must be transformed.
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|@modelcontextprotocol|jsdom|parse5|nwsapi|entities|@exodus/bytes|@asamuzakjp|@bramus|@csstools|css-tree|tough-cookie)/)',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default { ...baseConfig, ...config };
