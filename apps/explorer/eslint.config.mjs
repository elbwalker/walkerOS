import webConfig from '@walkeros/eslint/web.mjs';

export default [
  ...webConfig,
  {
    files: ['**/*.{ts,tsx}'],
    // Explorer-specific rules can be added here
  },
];
