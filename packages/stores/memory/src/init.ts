import type { Store } from '@walkeros/core';
import { createMemoryStore } from './store';
import type { MemoryStoreOptions } from './types';

/**
 * Store.Init-compatible wrapper for createMemoryStore.
 * Use this in Flow.Config configs. Use createMemoryStore() directly
 * for programmatic usage where Store.Context is not available.
 */
export const storeMemoryInit: Store.Init = (context) => {
  const settings = (context.config.settings ||
    {}) as Partial<MemoryStoreOptions>;
  const inner = createMemoryStore(settings);

  return {
    type: 'memory',
    config: context.config as Store.Config,
    get: inner.get,
    set: inner.set,
    delete: inner.delete,
    destroy: inner.destroy,
  };
};
