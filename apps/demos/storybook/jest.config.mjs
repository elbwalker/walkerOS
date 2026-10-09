import baseConfig from '@walkeros/config/jest/web.config';

const config = {
  // The base transform, with JSX compiled by the automatic runtime as
  // tsconfig's `react-jsx` does (no React import in every file).
  transform: {
    '^.+\\.(t|j|mj)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
        module: { type: 'es6' },
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(png|jpe?g|svg|webp)$': '<rootDir>/jest.file-stub.cjs',
    '^@walkeros/explorer$': '<rootDir>/jest.explorer-stub.cjs',
    ...baseConfig.moduleNameMapper,
  },
};

export default { ...baseConfig, ...config };
