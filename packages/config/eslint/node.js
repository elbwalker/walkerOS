import baseConfig from '@walkerOS/eslint';
import globals from 'globals';

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
];
