import baseConfig from '@walkeros/config/jest/web.config';

// @microsoft/clarity ships ESM only: transform it like the workspace packages.
const config = {
  transformIgnorePatterns: [
    '/node_modules/(?!(@walkeros|@microsoft/clarity)/)',
  ],
};

export default { ...baseConfig, ...config };
