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

    const context: Store.Context = {
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
