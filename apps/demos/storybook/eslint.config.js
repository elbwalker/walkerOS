import baseConfig from '@walkeros/config/eslint/web';
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
