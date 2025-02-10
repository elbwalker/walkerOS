import baseConfig from '@elbwalker/eslint-config';
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
