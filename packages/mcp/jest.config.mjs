import baseConfig from '@walkeros/config/jest/node.config';

const config = {
  // Transform ESM packages: MCP SDK is pure ESM
  transformIgnorePatterns: [
    'node_modules/(?!(@walkeros|@modelcontextprotocol)/)',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // ESM: Map .js imports to .ts files for Jest
    // (TypeScript source files use .js extensions for Node.js ESM)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Point to local CLI source for monorepo development
    '^@walkeros/cli$': '<rootDir>/../cli/src/',
    '^@walkeros/cli/dev$': '<rootDir>/../cli/src/dev',
  },
};

export default { ...baseConfig, ...config };
