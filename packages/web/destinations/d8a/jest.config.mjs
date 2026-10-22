import baseConfig from '@walkeros/config/jest/web.config';

// @d8a-tech/wt ships ESM only and exports no `require` condition: point jest
// at its module file and transform it like the workspace packages.
const config = {
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@d8a-tech/wt$':
      '<rootDir>/../../../../node_modules/@d8a-tech/wt/dist/index.min.mjs',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@walkeros|@d8a-tech)/)'],
};

export default { ...baseConfig, ...config };
