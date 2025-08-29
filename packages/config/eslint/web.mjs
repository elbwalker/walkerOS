import baseConfig from '@walkeros/eslint/index.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // web-specific rules
    },
  },
];
