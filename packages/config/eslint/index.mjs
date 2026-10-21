import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import awaitSend from './rules/await-send.mjs';
import noSilentReturn from './rules/no-silent-return.mjs';

// walkerOS rules for the delivery contract. At `warn` while the step packages
// migrate onto it; `error` once every package is migrated.
const walkeros = {
  rules: {
    'await-send': awaitSend,
    'no-silent-return': noSilentReturn,
  },
};

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
      walkeros,
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
      'walkeros/await-send': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ExportAllDeclaration[source.value=/(^|\\/)(examples|schemas)$/]",
          message:
            'Examples and schemas must be exported only from src/dev.ts (the ./dev subpath); a production-entry export leaks them into bundled output.',
        },
      ],
    },
  },
  {
    // Examples and schemas may only be exported from the dev surface, never a
    // production entry. The dev.ts subpath and the examples/ and schemas/
    // directory trees are dev-only zones (reached by the bundler only via
    // ./dev), so re-exporting example/schema sub-modules there is expected.
    files: ['**/src/dev.ts', '**/examples/**', '**/schemas/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // A destination's push and pushBatch never end with a bare return.
    files: ['**/destinations/**/*.{js,ts,tsx}'],
    rules: { 'walkeros/no-silent-return': 'warn' },
  },
  {
    // Relaxed rules for test files
    files: ['**/*.test.{js,ts,tsx}', '**/__tests__/**/*.{js,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'walkeros/await-send': 'off',
      'walkeros/no-silent-return': 'off',
    },
  },
];
