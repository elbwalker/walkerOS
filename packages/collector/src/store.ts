import type { Cache, Collector, Store } from '@walkeros/core';
import { emitStep, useHooks } from '@walkeros/core';
import { createCacheStore } from './cache-store';
import { buildBaseState } from './observerEmit';
import { wrapStoreWithCache } from './store-cache-wrapper';

/**
 * Narrowed view of a `Store.InitStore` entry that also carries the optional
 * `cache` configuration emitted by the bundler. The runtime `Store.InitStores`
 * map is loosely typed at the core level so it can carry pass-through fields
 * (`cache`, `variables`, etc.) without coupling the core `Store.InitStore`
 * shape to flow-level concerns. Phase 2 reads `cache` through this local view.
 */
type InitStoreWithCache = Store.InitStore & {
  cache?: Cache.Cache<Cache.StoreCacheRule>;
};

/**
 * Hook wrapping and observer emission for a single store instance.
 * Mutates `instance` in place.
 *
 * Called once per store, AFTER any cache wrapping in phase 2. Wrapping the
 * outer (wrapper) instance means observers see the consumer-facing
 * boundary: they fire on every `wrapped.get` regardless of cache HIT/MISS,
 * and only once per `wrapped.set` (not also for the wrapper's internal
 * write into `cacheStore`). If the store has no cache wrapper, the bare
 * backing is wrapped instead, preserving observability.
 *
 * Two responsibilities per op:
 *  1. Inner `useHooks(..., 'StoreGet', ...)` wrap keeps the generic
 *     user-declared hook contract working (`preStoreGet`, `postStoreSet`,
 *     etc.).
 *  2. Outer self-emit wrap pushes `FlowState` (`stepType: 'store'`) into
 *     `collector.observers` directly, so per-store telemetry no longer
 *     needs a separate hook bag.
 */
function applyStoreHooks(
  collector: Collector.Instance,
  instance: Store.Instance,
  storeId: string,
): void {
  const stepIdFor = `store.${storeId}`;

  const innerGet = useHooks(
    instance.get,
    'StoreGet',
    collector.hooks,
    collector.logger,
  );
  const innerSet = useHooks(
    instance.set,
    'StoreSet',
    collector.hooks,
    collector.logger,
  );
  const innerDelete = useHooks(
    instance.delete,
    'StoreDelete',
    collector.hooks,
    collector.logger,
  );

  instance.get = async (key: string): Promise<Store.StoreValue | undefined> => {
    const started = Date.now();
    const inState = buildBaseState(collector, {
      stepId: stepIdFor,
      stepType: 'store',
      phase: 'in',
      eventId: '',
      now: started,
    });
    inState.meta = { op: 'get', key };
    emitStep(collector, inState);

    try {
      const result = await innerGet(key);
      const finished = Date.now();
      const outState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'out',
        eventId: '',
        now: finished,
      });
      outState.durationMs = finished - started;
      outState.meta = { op: 'get', key };
      emitStep(collector, outState);
      return result;
    } catch (err) {
      const finished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'error',
        eventId: '',
        now: finished,
      });
      errState.durationMs = finished - started;
      errState.meta = { op: 'get', key };
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      emitStep(collector, errState);
      throw err;
    }
  };

  instance.set = async (
    key: string,
    value: Store.StoreValue,
    ttl?: number,
  ): Promise<void> => {
    const started = Date.now();
    const inState = buildBaseState(collector, {
      stepId: stepIdFor,
      stepType: 'store',
      phase: 'in',
      eventId: '',
      now: started,
    });
    // Store values can be secrets or PII: emit only the op + key, never the
    // raw value, on any phase (in/out/error). Observers see what happened,
    // not what was written.
    inState.meta = { op: 'set', key };
    emitStep(collector, inState);

    try {
      await innerSet(key, value, ttl);
      const finished = Date.now();
      const outState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'out',
        eventId: '',
        now: finished,
      });
      outState.durationMs = finished - started;
      outState.meta = { op: 'set', key };
      emitStep(collector, outState);
    } catch (err) {
      const finished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'error',
        eventId: '',
        now: finished,
      });
      errState.durationMs = finished - started;
      errState.meta = { op: 'set', key };
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      emitStep(collector, errState);
      throw err;
    }
  };

  instance.delete = async (key: string): Promise<void> => {
    const started = Date.now();
    const inState = buildBaseState(collector, {
      stepId: stepIdFor,
      stepType: 'store',
      phase: 'in',
      eventId: '',
      now: started,
    });
    inState.meta = { op: 'delete', key };
    emitStep(collector, inState);

    try {
      await innerDelete(key);
      const finished = Date.now();
      const outState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'out',
        eventId: '',
        now: finished,
      });
      outState.durationMs = finished - started;
      outState.meta = { op: 'delete', key };
      emitStep(collector, outState);
    } catch (err) {
      const finished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: stepIdFor,
        stepType: 'store',
        phase: 'error',
        eventId: '',
        now: finished,
      });
      errState.durationMs = finished - started;
      errState.meta = { op: 'delete', key };
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      emitStep(collector, errState);
      throw err;
    }
  };
}

/**
 * Walks the `cache.store` graph in topological order (terminals first) and
 * reports each store id together with its cache config. Detects cycles via
 * three-color DFS (WHITE → GRAY → BLACK) and rejects references to unknown
 * store ids. Throws on the first problem with a message naming the path.
 *
 * The returned order is suitable for wrapping: when a wrapper is built for
 * store X, its `cache.store` target (if any) has already been wrapped.
 */
function topoOrderForCacheWrap(
  defs: Record<string, InitStoreWithCache>,
): string[] {
  type Color = 'WHITE' | 'GRAY' | 'BLACK';
  const color: Record<string, Color> = {};
  for (const id of Object.keys(defs)) color[id] = 'WHITE';

  const order: string[] = [];
  const stack: string[] = [];

  function visit(id: string): void {
    const c = color[id];
    if (c === 'BLACK') return;
    if (c === 'GRAY') {
      const cycleStart = stack.indexOf(id);
      const cyclePath = stack
        .slice(cycleStart === -1 ? 0 : cycleStart)
        .concat(id)
        .join(' -> ');
      throw new Error(`Cycle in cache.store chain: ${cyclePath}`);
    }

    color[id] = 'GRAY';
    stack.push(id);

    const target = defs[id].cache?.store;
    if (target !== undefined) {
      if (!(target in defs)) {
        throw new Error(
          `Store "${id}" cache.store references "${target}", which is not declared in flow.stores`,
        );
      }
      visit(target);
    }

    stack.pop();
    color[id] = 'BLACK';
    order.push(id);
  }

  for (const id of Object.keys(defs)) {
    if (color[id] === 'WHITE') visit(id);
  }

  return order;
}

/**
 * Initialize store instances from configuration.
 *
 * Three-phase init:
 *   Phase 1, instantiate: call `code(context)` for every declared store.
 *     Order is not significant in this phase. Hooks are NOT installed yet —
 *     they wrap the outer boundary in phase 3.
 *   Phase 2, topologically wrap: walk the `cache.store` graph, detect cycles
 *     and unknown targets, then visit terminals first so any cache wrapper
 *     installed in Task 7+ can rely on its backing being already wrapped.
 *   Phase 3, install hooks: wrap the final instance (wrapper if cache was
 *     applied, otherwise the bare backing) so hooks fire at the consumer
 *     boundary and observe cache HIT/MISS behavior.
 *
 * Phase 2 must run before `resolveStoreReferences` in `collector.ts` so that
 * env-reference replacement uses the wrapped instance (referential identity
 * matters for the resolver).
 */
export async function initStores(
  collector: Collector.Instance,
  initStores: Store.InitStores = {},
): Promise<Store.Stores> {
  const result: Store.Stores = {};

  // Phase 1: instantiate every store. Hooks are deferred to phase 3 so they
  // can wrap the outer (cache-wrapped) instance and observe HIT/MISS at the
  // consumer-facing boundary.
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

  // Phase 2: validate the cache.store graph and wrap in topological order.
  // Cycle and missing-target errors propagate out of `topoOrderForCacheWrap`.
  // Read-through wrapping is delegated to `wrapStoreWithCache`. The cache
  // layer is either a user-declared store (resolved against the in-progress
  // `result` map) or the default `__cache`, which is created lazily here so
  // it ends up assigned to `collector.stores` together with the rest.
  const defsWithCache = initStores as Record<string, InitStoreWithCache>;
  const order = topoOrderForCacheWrap(defsWithCache);
  for (const storeId of order) {
    const cacheConfig = defsWithCache[storeId].cache;
    if (!cacheConfig) continue;

    let cacheStore: Store.Instance;
    let cacheStoreId: string;
    if (cacheConfig.store !== undefined) {
      // Missing-target validation already ran in `topoOrderForCacheWrap`, so
      // this lookup is guaranteed to hit.
      cacheStore = result[cacheConfig.store];
      cacheStoreId = cacheConfig.store;
    } else {
      if (!result.__cache) {
        result.__cache = createCacheStore();
      }
      cacheStore = result.__cache;
      cacheStoreId = '__cache';
    }

    // Schema rejects `namespace: ""` for store caches, so the only way the
    // wrapper sees an absent namespace is when the user omitted it entirely.
    // In that case default to the host store id so multiple wrapped stores
    // sharing `__cache` cannot collide on raw keys.
    const resolvedNamespace = cacheConfig.namespace ?? storeId;

    // One startup log line per wrapped store. Operators inspecting the cache
    // layer see prefixed keys (e.g. `api:K`); surfacing the resolved namespace
    // and cache-store id here keeps that defaulting from feeling like hidden
    // magic. Scope mirrors the wrapper's own scope (Task 8) so all
    // cache-related output groups under `store-cache:<id>`.
    collector.logger
      .scope('store-cache')
      .scope(storeId)
      .info(
        `store "${storeId}" caches with namespace "${resolvedNamespace}:" via ${cacheStoreId}`,
      );

    result[storeId] = wrapStoreWithCache(result[storeId], {
      storeId,
      cacheConfig,
      cacheStore,
      namespace: resolvedNamespace,
      logger: collector.logger.scope('store-cache').scope(storeId),
      collector,
    });
  }

  // Phase 3: install hooks on the final instance for every user-declared
  // store. Wrapping the OUTER instance (wrapper if a cache was applied,
  // bare backing otherwise) means the hook fires at the consumer-facing
  // boundary and observes cache HIT/MISS. The auto-created default
  // `__cache` is skipped — it has no consumer-facing contract; users never
  // call `__cache.get` directly. Skipping it also prevents the wrapper's
  // internal writes into the default cache from double-firing
  // `preStoreSet` against the consumer-facing boundary.
  for (const [storeId, instance] of Object.entries(result)) {
    if (storeId === '__cache') continue;
    applyStoreHooks(collector, instance, storeId);
  }

  return result;
}

/**
 * Resolve store references in component env values.
 *
 * The bundler resolves `$store.gcs` to a direct JS reference to the raw
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
