import type { Store } from '@walkeros/core';

/** Serve static files from a local directory */
export const staticAssets: Store.Config = {
  settings: {
    basePath: './public',
  },
};
