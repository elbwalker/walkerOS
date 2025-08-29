import baseConfig from '@walkeros/eslint/web.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];