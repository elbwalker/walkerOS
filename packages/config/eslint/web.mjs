import baseConfig, {
  nodeBuiltins,
  nodeGlobals,
  testFiles,
} from '@walkeros/config/eslint';
import globals from 'globals';

const message = 'Node only: web code runs in the browser.';

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // The platform boundary: web sources use no Node API.
    files: ['**/src/**/*.{js,ts,tsx}'],
    ignores: testFiles,
    rules: {
      'no-restricted-globals': [
        'error',
        ...nodeGlobals.map((name) => ({ name, message })),
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: nodeBuiltins.map((name) => ({ name, message })),
          patterns: [{ regex: '^node:', message }],
        },
      ],
    },
  },
];
