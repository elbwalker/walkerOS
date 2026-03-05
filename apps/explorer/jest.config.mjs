import baseConfig from '@walkeros/config/jest/web.config';

const config = {
  // Explorer-specific: Monaco mocks + clipboard mock
  setupFilesAfterEnv: [
    '@walkeros/config/jest/web.setup',
    '<rootDir>/jest.setup.ts',
  ],

  moduleNameMapper: {
    // Monaco mocks - MUST be before base mappings
    '^monaco-editor$': '<rootDir>/__mocks__/monaco-editor.cjs',
    'monaco-editor/esm/vs/.*\\?worker$': '<rootDir>/__mocks__/monaco-worker.cjs',
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Virtual module
    '^@walkeros/core/types$': '<rootDir>/jest-walkeros-types.cjs',
    // Raw imports
    '(.+)\\.d\\.ts\\?raw$': '$1.d.ts',
    // Inherit base mappings (AFTER explorer-specific ones)
    ...baseConfig.moduleNameMapper,
  },

  transform: {
    ...baseConfig.transform,
    '\\.d\\.ts$': '<rootDir>/jest-raw-loader.cjs',
  },

  detectOpenHandles: true,
};

export default { ...baseConfig, ...config };
