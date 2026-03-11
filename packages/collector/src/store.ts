import type { Collector, Store } from '@walkeros/core';

/**
 * Initialize store instances from configuration.
 * Stores are the simplest init of all component types:
 * no chains, no lazy init, no push handlers.
 */
export async function initStores(
  collector: Collector.Instance,
  initStores: Store.InitStores = {},
): Promise<Store.Stores> {
  const result: Store.Stores = {};

  for (const [storeId, storeDef] of Object.entries(initStores)) {
    const { code, config = {}, env = {} } = storeDef;

    const storeLogger = collector.logger.scope('store').scope(storeId);

    const context = {
      collector,
      logger: storeLogger,
      id: storeId,
      config,
      env,
    };

    const instance = await code(context);
    result[storeId] = instance;
  }

  return result;
}

/**
 * Resolve store references in component env values.
 *
 * The bundler resolves `$store:gcs` to a direct JS reference to the raw
 * store definition object (`stores.gcs = { code, config }`). After stores
 * are initialized, this function walks transformer/destination/source env
 * objects and replaces any raw store definition reference with the
 * corresponding initialized Store.Instance.
 *
 * IMPORTANT: Uses referential identity (`===`) to match env values against
 * raw store definitions. This works because the bundler generates code where
 * env values are direct references to the same objects in the `stores` map.
 * Programmatic configs must use the same object reference — copies won't match.
 *
 * Only resolves top-level env keys. Nested store references are not supported.
 */
export function resolveStoreReferences(
  rawStores: Store.InitStores,
  initializedStores: Store.Stores,
  initConfig: Collector.InitConfig,
): void {
  // Build a lookup: raw store def → initialized instance (O(1) per env value)
  const lookup = new Map<object, Store.Instance>();
  for (const [storeId, rawDef] of Object.entries(rawStores)) {
    if (initializedStores[storeId])
      lookup.set(rawDef, initializedStores[storeId]);
  }
  if (lookup.size === 0) return;

  function resolveEnv(env: Record<string, unknown> | undefined) {
    if (!env) return;
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'object' && value !== null) {
        const instance = lookup.get(value);
        if (instance) env[key] = instance;
      }
    }
  }

  // Walk all component types that may have env values
  for (const defs of [
    initConfig.transformers,
    initConfig.destinations,
    initConfig.sources,
  ]) {
    if (!defs) continue;
    for (const def of Object.values(defs)) {
      resolveEnv((def as { env?: Record<string, unknown> }).env);
    }
  }
}
