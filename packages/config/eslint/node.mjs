import baseConfig, { browserGlobals, testFiles } from '@walkeros/config/eslint';
import globals from 'globals';

const message = 'Browser only: server code runs in Node.';

// The platform boundary: server sources use no browser global, and no file,
// tests included, references the DOM lib, which would load it for the whole
// program.
export const nodePlatform = [
  {
    files: ['**/src/**/*.{js,ts,tsx}'],
    ignores: testFiles,
    rules: {
      'no-restricted-globals': [
        'error',
        ...browserGlobals.map((name) => ({ name, message })),
      ],
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { lib: 'never', types: 'never' },
      ],
    },
  },
];

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-process-exit': 'error',
      'no-path-concat': 'error',
      'no-buffer-constructor': 'error',
    },
  },
  ...nodePlatform,
];
