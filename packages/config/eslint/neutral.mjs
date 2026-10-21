import baseConfig, {
  browserGlobals,
  nodeBuiltins,
  nodeGlobals,
  testFiles,
} from '@walkeros/config/eslint';

const message =
  'A neutral package runs on web and server: it takes what one platform has through a port in @walkeros/core.';
const jsdom = {
  name: 'jsdom',
  message: 'jsdom loads the DOM types into the whole neutral program.',
};

// The platform boundary: neutral sources use neither platform's globals or
// Node imports, and read nothing through globalThis. No file, tests included,
// references a lib or types, or imports jsdom: either loads the DOM for the
// whole program.
export default [
  ...baseConfig,
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { lib: 'never', types: 'never' },
      ],
      'no-restricted-imports': ['error', { paths: [jsdom] }],
    },
  },
  {
    files: ['**/src/**/*.{js,ts,tsx}'],
    ignores: testFiles,
    rules: {
      'no-restricted-globals': [
        'error',
        ...[...browserGlobals, ...nodeGlobals, 'globalThis'].map((name) => ({
          name,
          message,
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [...nodeBuiltins.map((name) => ({ name, message })), jsdom],
          patterns: [{ regex: '^node:', message }],
        },
      ],
    },
  },
];
