module.exports = {
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  ignorePatterns: [
    '**/coverage/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/__mocks__/**',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier',
  ],
  rules: {
    'no-console': 'warn',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
  },
};
