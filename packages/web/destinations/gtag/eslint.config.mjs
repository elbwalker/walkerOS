import baseConfig from '@walkeros/config/eslint/web';

export default [
  ...baseConfig,
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];