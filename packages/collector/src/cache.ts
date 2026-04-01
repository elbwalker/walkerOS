import type { Collector, Store } from '@walkeros/core';
import type { CompiledCache } from '@walkeros/core';

/**
 * Returns the store for a compiled cache config.
 * Uses the explicit store reference if provided, otherwise falls back to the
 * collector's default __cache store.
 */
export function getCacheStore(
  compiled: CompiledCache,
  collector: Collector.Instance,
): Store.Instance | undefined {
  if (compiled.storeId && collector.stores[compiled.storeId]) {
    return collector.stores[compiled.storeId];
  }
  return collector.stores.__cache;
}
