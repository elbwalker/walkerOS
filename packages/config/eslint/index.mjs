import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/__mocks__/**',
    ],
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      jest,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
