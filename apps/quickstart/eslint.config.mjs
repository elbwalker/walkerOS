import config from '../../packages/config/eslint/index.mjs';

export default [
  ...config,
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-console': 'off', // Console is used for demonstration purposes in quickstart examples
    },
  },
];