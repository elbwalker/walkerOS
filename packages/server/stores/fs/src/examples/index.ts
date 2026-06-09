import type { Store } from '@walkeros/core';

/** Serve static files from a local directory, byte-exact (file mode) */
export const staticAssets: Store.Config = {
  settings: {
    basePath: './public',
  },
  file: true,
};

/** Structured key-value store on disk (default mode) */
export const structuredState: Store.Config = {
  settings: {
    basePath: './state',
  },
};

export * as step from './step';
