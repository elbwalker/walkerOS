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

/**
 * Returns the store for a declarative `state` operation.
 * An explicit store id resolves to `collector.stores[id]` (or `undefined`
 * when that store is not declared). An omitted id falls back to the default
 * in-memory `__cache` store.
 */
export function getStateStore(
  storeId: string | undefined,
  collector: Pick<Collector.Instance, 'stores'>,
): Store.Instance | undefined {
  if (storeId) return collector.stores[storeId];
  return collector.stores.__cache;
}
