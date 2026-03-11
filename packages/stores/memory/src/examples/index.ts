import type { Store } from '@walkeros/core';

/** Default settings -- LRU cache with 10 MB limit */
export const defaults: Store.Config = {
  settings: {},
};

/** Custom cache -- small, bounded store for sessions */
export const sessionCache: Store.Config = {
  settings: {
    maxSize: 1024 * 1024, // 1 MB
    maxEntries: 100,
  },
};

export * as step from './step';
