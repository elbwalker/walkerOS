import neutralConfig from '@walkeros/config/eslint/neutral';

export default [
  ...neutralConfig,
  {
    // The ./node entry is Node code; jsdom stays banned there too.
    files: ['src/node.ts', 'src/node/**'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-imports': ['error', 'jsdom'],
    },
  },
];
