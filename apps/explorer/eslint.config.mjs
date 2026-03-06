import baseConfig from '@walkeros/config/eslint/web';
import storybook from 'eslint-plugin-storybook';

export default [
  ...baseConfig,
  ...storybook.configs['flat/recommended'],
];
