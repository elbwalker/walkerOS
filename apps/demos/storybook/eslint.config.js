import baseConfig from '@walkeros/eslint/web.mjs';
import storybook from 'eslint-plugin-storybook';

export default [
  {
    ignores: ['storybook-static/**'],
  },
  ...baseConfig,
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.stories.{js,ts,tsx}'],
    rules: {
      // Storybook-specific rule overrides if needed
    },
  },
];
