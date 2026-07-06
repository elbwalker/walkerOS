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

  // shiki, its @shikijs/* internals, and the hast/unist/micromark ESM graph
  // that codeToHtml pulls in ship ESM only. The synchronous highlighter is
  // imported into the render path, so jest must transform them (the base
  // allowlist only covers @walkeros). Listed by package-name prefix so a minor
  // dependency bump doesn't silently break the transform.
  transformIgnorePatterns: [
    '/node_modules/(?!(' +
      [
        '@walkeros',
        'shiki',
        '@shikijs',
        '@ungap',
        'hast-util-',
        'mdast-util-',
        'unist-util-',
        'micromark-',
        'character-entities-',
        'comma-separated-tokens',
        'space-separated-tokens',
        'oniguruma-',
        'oniguruma-to-es',
        'regex',
        'vfile',
        'property-information',
        'stringify-entities',
        'html-void-elements',
        'trim-lines',
        'devlop',
        'ccount',
        'zwitch',
      ].join('|') +
      '))',
  ],

  detectOpenHandles: true,
};

export default { ...baseConfig, ...config };
