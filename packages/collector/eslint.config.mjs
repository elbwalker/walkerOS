import neutralConfig from '@walkeros/config/eslint/neutral';
import { browserGlobals, nodeGlobals } from '@walkeros/config/eslint';

export default [
  ...neutralConfig,
  {
    // The kit's one replace(globalThis, 'fetch', ...): globalThis is allowed
    // here, every other platform global stays banned.
    files: ['src/dev/boundary.ts'],
    rules: {
      'no-restricted-globals': ['error', ...browserGlobals, ...nodeGlobals],
    },
  },
];
