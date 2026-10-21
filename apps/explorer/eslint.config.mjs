import baseConfig from '@walkeros/config/eslint/web';
import { nodeGlobals } from '@walkeros/config/eslint';
import storybook from 'eslint-plugin-storybook';

export default [
  ...baseConfig,
  ...storybook.configs['flat/recommended'],
  {
    // walkeros-design-check is a Node bin, not web code.
    files: ['src/design/check/**', 'src/design/generate.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    // process.env.NODE_ENV is the define every React bundler sets.
    files: ['src/components/atoms/code.tsx'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...nodeGlobals.filter((name) => name !== 'process'),
      ],
    },
  },
];
