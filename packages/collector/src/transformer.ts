/**
 * @module transformer
 *
 * Transformer Chain Utilities
 * ==========================
 *
 * This module provides the unified implementation for transformer chains in walkerOS.
 * Chains are used at two points in the data flow:
 *
 * 1. Pre-collector chains (source.next):
 *    Source → [Transformer Chain] → Collector
 *    Events are processed before the collector sees them.
 *
 * 2. Post-collector chains (destination.before):
 *    Collector → [Transformer Chain] → Destination
 *    Events are processed before reaching specific destinations.
 *
 * Key Functions:
 * - extractTransformerNextMap(): Extracts next links from transformer instances
 * - extractChainProperty(): Unified extraction of chain properties from definitions
 * - walkChain(): Resolves chain IDs from starting point
 * - runTransformerChain(): Executes a chain of transformers on an event
 *
 * Chain Resolution:
 * - String start: Walk transformer.next links until chain ends
 * - Array start: Use array directly (explicit chain, ignores transformer.next)
 *
 * Chain Termination:
 * - Transformer returns false → chain stops, event is dropped
 * - Transformer throws error → chain stops, event is dropped
 * - Transformer returns void → continue with unchanged event
 * - Transformer returns event → continue with modified event
 */
import type {
  Cache,
  Collector,
  Transformer,
  WalkerOS,
  Ingest,
} from '@walkeros/core';
import {
  createIngest,
  emitStep,
  FatalError,
  isObject,
  stepId,
  tryCatchAsync,
  useHooks,
  getNextSteps,
  compileCache,
  checkCache,
  storeCache,
  buildCacheContext,
  validateStepEntry,
  processEventMapping,
  compileState,
  applyState,
} from '@walkeros/core';
import { buildBaseState, journeyFields } from './observerEmit';
import { getCacheStore, getStateStore } from './cache';
import { buildReportError } from './report-error';

/**
 * Extracts transformer next configuration for chain walking.
 * Maps transformer instances to their config.next values.
 *
 * This is the single source of truth for extracting chain links.
 * Used by both source.ts (pre-collector chains) and destination.ts (post-collector chains).
 *
 * @param transformers - Map of transformer instances
 * @returns Map of transformer IDs to their next configuration
 */
export function extractTransformerNextMap(
  transformers: Transformer.Transformers,
): Record<string, { next?: string | string[] }> {
  const result: Record<string, { next?: string | string[] }> = {};
  for (const [id, transformer] of Object.entries(transformers)) {
    const next = transformer.config?.next;
    // Static shapes are recorded for synchronous chain walking.
    // Conditional shapes (RouteConfig, mixed arrays) resolve per-event via
    // getNextSteps at dispatch time; they get an empty entry here so the
    // chain walker stops at this hop rather than following a stale link.
    if (typeof next === 'string') {
      result[id] = { next };
    } else if (
      Array.isArray(next) &&
      next.every((entry) => typeof entry === 'string')
    ) {
      result[id] = { next: next as string[] };
    } else {
      result[id] = {};
    }
  }
  return result;
}

/**
 * Extracts chain property from definition and merges into config.
 * Provides unified handling for source.next, destination.before, and transformer.next.
 *
 * @param definition - Component definition with optional chain property
 * @param propertyName - Name of chain property ('next' or 'before')
 * @returns Object with merged config and extracted chain value
 */
export function extractChainProperty<
  T extends { config?: Record<string, unknown>; [key: string]: unknown },
>(
  definition: T,
  propertyName: 'next' | 'before',
): {
  config: Record<string, unknown>;
  chainValue: string | string[] | undefined;
} {
  const config = (definition.config || {}) as Record<string, unknown>;
  const chainValue = definition[propertyName] as string | string[] | undefined;

  if (chainValue !== undefined) {
    return {
      config: { ...config, [propertyName]: chainValue },
      chainValue,
    };
  }

  return { config, chainValue: undefined };
}

/**
 * Walks a transformer chain starting from a given transformer ID.
 * Returns ordered array of transformer IDs in the chain.
 *
 * Used for on-demand chain resolution:
 * - Called from destination.ts with destination.config.before
 * - Called from source.ts with source.config.next
 *
 * @param startId - First transformer in chain, or explicit array of transformer IDs
 * @param transformers - Available transformer configs with optional `next` field
 * @returns Ordered array of transformer IDs to execute
 *
 * @example
 * // Single transformer
 * walkChain('redact', { redact: {} }) // ['redact']
 *
 * @example
 * // Chain via next
 * walkChain('a', { a: { next: 'b' }, b: { next: 'c' }, c: {} }) // ['a', 'b', 'c']
 *
 * @example
 * // Explicit array
 * walkChain(['x', 'y'], {}) // ['x', 'y']
 */
export function walkChain(
  startId: string | string[] | undefined,
  transformers: Record<string, { next?: string | string[] }> = {},
): string[] {
  if (!startId) return [];

  // If array provided, use it directly (explicit chain)
  if (Array.isArray(startId)) {
    return startId;
  }

  // Walk the chain via transformer.next links
  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startId;

  while (current && transformers[current]) {
    if (visited.has(current)) {
      // Circular reference detected - stop walking
      break;
    }
    visited.add(current);
    chain.push(current);

    const next: string | string[] | undefined = transformers[current].next;

    // If transformer has array next, append it and stop walking
    if (Array.isArray(next)) {
      chain.push(...next);
      break;
    }

    current = next;
  }

  return chain;
}

/**
 * Initializes transformer instances from configuration.
 * Does NOT call transformer.init() - that happens lazily before first push.
 *
 * @param collector - The collector instance
 * @param initTransformers - Transformer initialization configurations
 * @returns Initialized transformer instances
 */
export async function initTransformers(
  collector: Collector.Instance,
  initTransformers: Transformer.InitTransformers = {},
): Promise<Transformer.Transformers> {
  const result: Transformer.Transformers = {};

  for (const [transformerId, transformerDef] of Object.entries(
    initTransformers,
  )) {
    const { code, env = {} } = transformerDef;

    // Validate the entry via the shared predicate. A code-less entry must
    // declare at least one operative field (package, before, next, cache,
    // state, mapping). Unknown keys and code+package conflicts are also
    // rejected.
    const validation = validateStepEntry(
      transformerDef as Record<string, unknown>,
      'Transformer',
    );
    if (!validation.ok) {
      collector.logger.warn(
        `Transformer ${transformerId} invalid (${validation.code}): ${validation.reason}. Skipping.`,
      );
      continue;
    }

    // Use unified chain property extractor for both before and next
    const { config: configWithBefore } = extractChainProperty(
      transformerDef,
      'before',
    );
    const { config: configWithChain } = extractChainProperty(
      { ...transformerDef, config: configWithBefore },
      'next',
    );

    // Merge definition-level env into config so it's available during push.
    // transformerPush reads transformer.config.env to build the push context.
    const configWithEnv =
      Object.keys(env).length > 0
        ? { ...configWithChain, env: env as Transformer.Env }
        : configWithChain;

    // Merge definition-level cache into config for runtime access
    const { cache } = transformerDef;
    const configWithCache = cache ? { ...configWithEnv, cache } : configWithEnv;

    // Merge definition-level state into config for runtime access. A
    // config-level `state` (if present) takes precedence over def-level.
    const resolvedState = transformerDef.config?.state ?? transformerDef.state;
    const configWithState =
      resolvedState !== undefined && configWithCache.state === undefined
        ? { ...configWithCache, state: resolvedState }
        : configWithCache;

    // Build transformer context for init
    const transformerLogger = collector.logger
      .scope('transformer')
      .scope(transformerId);

    const context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      ingest: createIngest(transformerId),
      config: configWithState,
      env: env as Transformer.Env,
      reportError: buildReportError(
        collector,
        'transformer',
        transformerId,
        transformerLogger,
      ),
    };

    // Synthesize a passthrough instance when `code` is absent.
    // This makes the entry a "pass" — a named, code-less hop. Two flavors:
    //   1. mapping-aware: when `mapping` is declared, the synthesized push
    //      runs `processEventMapping` and forwards the transformed event
    //      (or drops it when a rule has `ignore: true`).
    //   2. plain passthrough: when only `before` / `next` / `cache` are
    //      declared, the push returns the event unchanged.
    const codeFn =
      code ??
      ((ctx: Transformer.Context) => {
        const stepMapping = transformerDef.mapping;
        if (stepMapping) {
          // Warn once per init if vendor-payload fields are present at the
          // transformer position. Only event-mutating fields apply here.
          // Note: `MappingConfig` has no top-level `silent` field — that
          // lives on `Rule` only, so the config-level check is `data` only.
          const meaninglessFields: string[] = [];
          if (stepMapping.data !== undefined) meaninglessFields.push('data');
          // Walk rules for per-rule data/silent
          if (stepMapping.mapping) {
            for (const [entity, actions] of Object.entries(
              stepMapping.mapping,
            )) {
              if (typeof actions !== 'object' || actions === null) continue;
              for (const [action, rule] of Object.entries(
                actions as Record<string, unknown>,
              )) {
                if (typeof rule !== 'object' || rule === null) continue;
                const r = rule as Record<string, unknown>;
                if (r.data !== undefined)
                  meaninglessFields.push(`mapping[${entity}][${action}].data`);
                if (r.silent !== undefined)
                  meaninglessFields.push(
                    `mapping[${entity}][${action}].silent`,
                  );
              }
            }
          }
          if (meaninglessFields.length > 0) {
            ctx.collector.logger.warn(
              `Transformer ${transformerId}: \`${meaninglessFields.join(', ')}\` ignored at transformer position (only event-mutating fields apply).`,
            );
          }

          return {
            type: 'pass',
            config: ctx.config,
            push: async (event: WalkerOS.DeepPartialEvent) => {
              const r = await processEventMapping(
                event,
                stepMapping,
                ctx.collector,
              );
              if (r.ignore) return false;
              return { event: r.event };
            },
          };
        }
        return {
          type: 'pass',
          config: ctx.config,
          push: (event: WalkerOS.DeepPartialEvent) => ({ event }),
        };
      });

    // Initialize the transformer instance with context
    const instance = await codeFn(context);

    // Bug 2 fix: propagate def-level before/next to instance.config when
    // not already set by the code function. The recursive chain walker
    // reads instance.config.before; for synthesized pass-throughs and
    // well-behaved user code that returns a fresh config object, the
    // def-level value needs to land on instance.config explicitly.
    // User-supplied code that sets its own config.before is preserved.
    if (
      transformerDef.before !== undefined &&
      instance.config?.before === undefined
    ) {
      instance.config = {
        ...(instance.config ?? {}),
        before: transformerDef.before,
      };
    }
    if (
      transformerDef.next !== undefined &&
      instance.config?.next === undefined
    ) {
      instance.config = {
        ...(instance.config ?? {}),
        next: transformerDef.next,
      };
    }
    // Propagate the precedence-resolved state (config-level wins over
    // def-level) onto instance.config when a custom factory dropped it.
    if (resolvedState !== undefined && instance.config?.state === undefined) {
      instance.config = {
        ...(instance.config ?? {}),
        state: resolvedState,
      };
    }

    result[transformerId] = instance;
  }

  return result;
}

/**
 * Initializes a transformer if it hasn't been initialized yet.
 * Called lazily before first push.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to initialize
 * @param transformerId - The transformer ID
 * @returns Whether initialization succeeded
 */
export async function transformerInit(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
): Promise<boolean> {
  // Check if already initialized
  if (transformer.init && !transformer.config.init) {
    const transformerType = transformer.type || 'unknown';
    const transformerLogger = collector.logger.scope(
      `transformer:${transformerType}`,
    );

    const context: Transformer.Context = {
      collector,
      logger: transformerLogger,
      id: transformerId,
      ingest: createIngest(transformerId),
      config: transformer.config,
      env: mergeTransformerEnvironments(transformer.config.env),
      reportError: buildReportError(
        collector,
        'transformer',
        transformerId,
        transformerLogger,
      ),
    };

    transformerLogger.debug('init');

    const configResult = await useHooks(
      transformer.init,
      'TransformerInit',
      collector.hooks,
      collector.logger,
    )(context);

    // Check for initialization failure
    if (configResult === false) return false;

    // Update config if returned, preserving env from definition
    transformer.config = {
      ...(configResult || transformer.config),
      env:
        ((configResult as Record<string, unknown>)?.env as Transformer.Env) ||
        transformer.config.env,
      init: true,
    };

    transformerLogger.debug('init done');
  }

  return true;
}

/**
 * Pushes an event through a single transformer.
 *
 * @param collector - The collector instance
 * @param transformer - The transformer to push to
 * @param transformerId - The transformer ID
 * @param event - The event to process
 * @param ingest - Mutable ingest context flowing through the pipeline
 * @returns The processed event, void for passthrough, or false to stop chain
 */
export async function transformerPush(
  collector: Collector.Instance,
  transformer: Transformer.Instance,
  transformerId: string,
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: import('@walkeros/core').RespondFn,
): Promise<Transformer.Result | Transformer.Result[] | false | void> {
  const transformerType = transformer.type || 'unknown';
  const transformerLogger = collector.logger.scope(
    `transformer:${transformerType}`,
  );

  const context: Transformer.Context = {
    collector,
    logger: transformerLogger,
    id: transformerId,
    ingest: ingest!, // Mutable shared context
    config: transformer.config,
    env: {
      ...mergeTransformerEnvironments(transformer.config.env),
      ...(respond ? { respond } : {}),
    },
    reportError: buildReportError(
      collector,
      'transformer',
      transformerId,
      transformerLogger,
    ),
  };

  transformerLogger.debug('push', { event: (event as { name?: string }).name });

  const eventId = typeof event.id === 'string' ? event.id : '';
  const { traceId, sourceId, parentEventId } = journeyFields(
    event,
    ingest,
    collector,
  );
  const started = Date.now();
  const inState = buildBaseState(collector, {
    stepId: stepId('transformer', transformerId),
    stepType: 'transformer',
    phase: 'in',
    eventId,
    now: started,
    traceId,
    sourceId,
    parentEventId,
  });
  inState.inEvent = event;
  emitStep(collector, inState);

  try {
    const result = await useHooks(
      transformer.push,
      'TransformerPush',
      collector.hooks,
      collector.logger,
    )(event, context);

    const finished = Date.now();
    const outState = buildBaseState(collector, {
      stepId: stepId('transformer', transformerId),
      stepType: 'transformer',
      phase: 'out',
      eventId,
      now: finished,
      traceId,
      sourceId,
      parentEventId,
    });
    outState.durationMs = finished - started;
    outState.outEvent = result;
    emitStep(collector, outState);

    transformerLogger.debug('push done');

    return result;
  } catch (err) {
    const finished = Date.now();
    const errState = buildBaseState(collector, {
      stepId: stepId('transformer', transformerId),
      stepType: 'transformer',
      phase: 'error',
      eventId,
      now: finished,
      traceId,
      sourceId,
      parentEventId,
    });
    errState.durationMs = finished - started;
    errState.error =
      err instanceof Error
        ? { name: err.name, message: err.message }
        : { message: String(err) };
    emitStep(collector, errState);
    throw err;
  }
}

/**
 * Clone an ingest for an independent branch (e.g. a `many` fan-out branch).
 *
 * Each branch needs its own `_meta.path` so cycle protection and the
 * MAX_PATH_LENGTH safety valve operate per-branch rather than colliding
 * across sibling forks. The top-level object and `_meta` are shallow-copied;
 * `_meta.path` is duplicated so appends in one branch do not leak into others.
 *
 * `branchId` is reserved for future per-branch labelling (Task 4.1) and is
 * not currently written into `_meta`; it is accepted now so callers don't
 * need to change their call sites when error-isolation lands.
 */
export function cloneIngest(
  ingest: Ingest | undefined,
  branchId: string,
): Ingest {
  if (!ingest) return createIngest(branchId);
  return {
    ...ingest,
    _meta: { ...ingest._meta, path: [...ingest._meta.path] },
  };
}

/**
 * Runs an event through a chain of transformers.
 *
 * @param collector - The collector instance with transformers
 * @param transformers - Map of transformer instances
 * @param chain - Ordered array of transformer IDs to execute
 * @param event - The event to process
 * @param ingest - Mutable ingest context flowing through the pipeline
 * @returns The processed event or null if chain was stopped
 */
export async function runTransformerChain(
  collector: Collector.Instance,
  transformers: Transformer.Transformers,
  chain: string[],
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: import('@walkeros/core').RespondFn,
  chainContext?: string,
): Promise<Transformer.ChainResult> {
  const MAX_PATH_LENGTH = 256;

  // Ensure an ingest exists so the per-branch path budget engages
  // regardless of caller. Production callers (source/push/destination)
  // always pass one; this guards direct test invocations and any future
  // entrypoint that omits it. Without an ingest, the safety valve below
  // can never trip — leaving cyclic `many` graphs unbounded.
  if (!ingest) {
    ingest = createIngest(chain[0] ?? 'chain');
  }

  if (chainContext && ingest._meta) {
    ingest._meta.chainPath = chainContext;
  }

  let processedEvent = event;
  let currentRespond = respond;

  for (const transformerName of chain) {
    const transformer = transformers[transformerName];
    if (!transformer) {
      collector.logger.warn(`Transformer not found: ${transformerName}`);
      continue;
    }

    // Safety valve: prevent unbounded path growth
    if (ingest && ingest._meta && ingest._meta.path.length > MAX_PATH_LENGTH) {
      collector.logger.error(`Max path length exceeded at ${transformerName}`);
      return { event: null, respond: currentRespond };
    }

    // Track step in _meta (runtime-managed)
    if (ingest && ingest._meta) {
      ingest._meta.hops++;
      ingest._meta.path.push(transformerName);
    }

    // Initialize transformer if needed. The wrap surfaces a thrown init
    // (misconfiguration, missing env, etc.) with full cause via the scoped
    // logger and counts it on `status.failed`. A non-throw `false` return
    // from transformerInit itself flows through the same early-return below
    // (handled by the destination's own log; counter remains untouched on
    // the deliberate-false path).
    const isInitialized = await tryCatchAsync(
      transformerInit,
      (err: unknown): boolean => {
        if (err instanceof FatalError) throw err;
        collector.status.failed++;
        collector.logger
          .scope(`transformer:${transformer.type || 'unknown'}`)
          .error('transformer init failed', {
            transformer: transformerName,
            error: err,
          });
        return false;
      },
    )(collector, transformer, transformerName);

    if (!isInitialized) {
      // Stop chain on init failure. Thrown cases were already logged with
      // full cause via the onError above; deliberate-false returns leave
      // the chain stop signal intact without extra noise.
      return { event: null, respond: currentRespond };
    }

    // Path-specific mock check (takes precedence)
    if (
      chainContext &&
      transformer.config?.chainMocks?.[chainContext] !== undefined
    ) {
      const chainMock = transformer.config.chainMocks[chainContext];
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .debug('chainMock', { chain: chainContext });
      processedEvent = chainMock as WalkerOS.DeepPartialEvent;
      continue;
    }

    // Global mock check
    if (transformer.config?.mock !== undefined) {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .debug('mock');
      processedEvent = transformer.config.mock as WalkerOS.DeepPartialEvent;
      continue;
    }

    // Disabled check
    if (transformer.config?.disabled) {
      continue;
    }

    // Compile transformer cache once (reused for HIT check and MISS store).
    // Transformer caches operate on events (step-level HIT/MISS keyed by event
    // fields), so the rule shape is always EventCacheRule, not StoreCacheRule.
    const tCacheConfig = transformer.config?.cache as
      | Cache.Cache<Cache.EventCacheRule>
      | undefined;
    const compiledTCache = tCacheConfig
      ? compileCache(tCacheConfig)
      : undefined;
    const tCacheStore = compiledTCache
      ? getCacheStore(compiledTCache, collector)
      : undefined;

    // Compile declarative state entries once. `get` runs before the step's
    // mapping (so the mapping can read fetched values); `set` runs after the
    // mapping settles `processedEvent` and before the `next` dispatch.
    const stateEntries = transformer.config?.state
      ? compileState(transformer.config.state)
      : undefined;
    const stateGet = stateEntries?.filter((entry) => entry.mode === 'get');
    const stateSet = stateEntries?.filter((entry) => entry.mode === 'set');

    // Apply `state[set]` to a settled event right before it is routed. Called
    // once per emitted event on every emitting path (straight-through,
    // runtime `{ next }` single/many, conditional `config.next`, and per fork
    // of a `Result[]` fan-out). Not called on halted paths (push returned
    // `false`, a `cache.stop` HIT, a stopped before-chain, init failure).
    const applyStateSet = async (
      evt: WalkerOS.DeepPartialEvent,
    ): Promise<WalkerOS.DeepPartialEvent> => {
      if (!stateSet || stateSet.length === 0) return evt;
      return applyState(
        stateSet,
        (id) => getStateStore(id, collector),
        evt,
        collector,
      );
    };

    // Check transformer cache (step-level: skip push, continue chain)
    let cacheMiss: { key: string; ttl: number } | undefined;
    if (compiledTCache && tCacheStore) {
      const cacheContext = buildCacheContext(ingest, processedEvent);
      const cacheResult = await checkCache(
        compiledTCache,
        tCacheStore,
        cacheContext,
      );

      if (cacheResult?.status === 'HIT' && cacheResult.value) {
        processedEvent = cacheResult.value as WalkerOS.DeepPartialEvent;
        if (compiledTCache.stop)
          // stop=true → stop chain AND halt pipeline at this position.
          // Caller branches on `stopped` to skip downstream stages
          // (collector.push, destinations); see push.ts and source.ts.
          return {
            event: processedEvent,
            respond: currentRespond,
            stopped: true,
          };
        continue; // stop=false → next transformer
      }

      if (cacheResult?.status === 'MISS') {
        cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
      }
    }

    // Run transformer.before chain if configured.
    //
    // Dispatch uses `getNextSteps`:
    // - []             → no route matched; skip the before chain (passthrough).
    // - ['x']          → sequential continuation; walk static .next links from x
    //                    and run as a single subchain. Preserves cache.stop and
    //                    null/respond propagation from the nested chain.
    // - ['a','b',...]  → `many` fan-out. Each branch is an independent
    //                    terminal subchain with a cloned ingest (per-branch
    //                    cycle protection). No merge: many is fan-out, not
    //                    enrichment, so parent processedEvent is unchanged.
    //                    Per-branch error isolation lands in Task 4.1;
    //                    respond suppression lands in Task 4.2.
    const transformerBefore = transformer.config.before;
    if (transformerBefore) {
      const beforeIds = getNextSteps(
        transformerBefore,
        buildCacheContext(ingest, processedEvent),
      );
      if (beforeIds.length === 1) {
        const beforeChainIds = walkChain(
          beforeIds[0],
          extractTransformerNextMap(transformers),
        );
        if (beforeChainIds.length > 0) {
          const beforeResult = await runTransformerChain(
            collector,
            transformers,
            beforeChainIds,
            processedEvent,
            ingest,
            currentRespond,
            chainContext,
          );
          if (beforeResult.event === null)
            return {
              event: null,
              respond: beforeResult.respond ?? currentRespond,
            }; // Before chain stopped
          // Propagate pipeline-halt from a nested `cache.stop: true` HIT in
          // the before chain. The outer caller (push.ts / source.ts) drops
          // the event before destinations see it.
          if (beforeResult.stopped) {
            return {
              event: Array.isArray(beforeResult.event)
                ? beforeResult.event[0]
                : beforeResult.event,
              respond: beforeResult.respond ?? currentRespond,
              stopped: true,
            };
          }
          if (beforeResult.respond) currentRespond = beforeResult.respond;
          // Before chains use first result if fan-out occurred
          processedEvent = Array.isArray(beforeResult.event)
            ? beforeResult.event[0]
            : beforeResult.event;
        }
      } else if (beforeIds.length > 1) {
        // many: independent terminal subchains. Each branch walks to its own
        // exit with a per-branch ingest clone. Per-branch error isolation
        // (Task 4.1): wrap each branch dispatch in `tryCatchAsync` so a
        // throw in one branch (init failure, unforeseen runtime error) does
        // not reject the surrounding `Promise.all` and starve siblings.
        // No-respond-across-many: respond ownership cannot be unambiguously
        // assigned when one inbound request fans out to N terminal flows.
        // Branch dispatch passes `undefined` instead of `currentRespond`, and
        // branch results are awaited and discarded — currentRespond is NOT
        // updated from any branch's wrapped respond.
        await Promise.all(
          beforeIds.map((id) =>
            tryCatchAsync(runTransformerChain, (err) => {
              collector.logger
                .scope('transformer:many')
                .error(`many branch ${id} failed`, { error: err });
              return { event: null, respond: undefined };
            })(
              collector,
              transformers,
              walkChain(id, extractTransformerNextMap(transformers)),
              processedEvent,
              cloneIngest(ingest, id),
              undefined,
              chainContext,
            ),
          ),
        );
        // No merge: many is fan-out, not enrichment. Parent processedEvent
        // unchanged.
      }
    }

    // state[get]: read from the store and write fetched values onto the event
    // before the transformer's mapping runs.
    if (stateGet && stateGet.length > 0) {
      processedEvent = await applyState(
        stateGet,
        (id) => getStateStore(id, collector),
        processedEvent,
        collector,
      );
    }

    // Run the transformer
    const result = await tryCatchAsync(transformerPush, (err) => {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .error('Push failed', { error: err });
      return false as const; // Stop chain on error
    })(
      collector,
      transformer,
      transformerName,
      processedEvent,
      ingest,
      currentRespond,
    );

    // Handle result
    if (result === false) {
      // Transformer explicitly stopped the chain (returned false, or threw
      // and was converted to false by the error handler above).
      return {
        event: null,
        respond: currentRespond,
        droppedBy: transformerName,
      };
    }

    // Handle Result array (fan-out) — MUST be before typeof === 'object'
    if (Array.isArray(result)) {
      const remainingChain = chain.slice(chain.indexOf(transformerName) + 1);

      const forkResults = await Promise.all(
        result.map(async (forkResult) => {
          const forkEvent = await applyStateSet(
            forkResult.event || processedEvent,
          );
          // Clone ingest per fork to prevent cross-fork contamination
          const forkIngest = cloneIngest(ingest, 'unknown');

          if (forkResult.next) {
            // Fork has explicit routing. Dispatch uses `getNextSteps`:
            // - []             → no route matched; passthrough this fork's
            //                    event without entering any subchain (fork
            //                    has explicit routing, so we do NOT fall
            //                    through to remainingChain).
            // - ['x']          → walk static .next from x and run that as a
            //                    single subchain. Preserves the existing
            //                    "fork has explicit routing terminates the
            //                    main chain at this branch" semantic — the
            //                    subchain's ChainResult is this fork's
            //                    result.
            // - ['a','b',...]  → `many` fan-out. Each id dispatches as its
            //                    own terminal subchain with a per-branch
            //                    cloned ingest. Returns an array of
            //                    ChainResults; the outer `.flat()` in the
            //                    aggregation loop folds them into the
            //                    surrounding flatEvents collection.
            const forkIds = getNextSteps(
              forkResult.next,
              buildCacheContext(forkIngest, forkEvent),
            );
            if (forkIds.length === 0) {
              return { event: forkEvent, respond: currentRespond };
            }
            if (forkIds.length === 1) {
              const branchedChain = walkChain(
                forkIds[0],
                extractTransformerNextMap(transformers),
              );
              if (branchedChain.length > 0) {
                return runTransformerChain(
                  collector,
                  transformers,
                  branchedChain,
                  forkEvent,
                  forkIngest,
                  currentRespond,
                  chainContext,
                );
              }
              return { event: forkEvent, respond: currentRespond };
            }
            // Terminal fan-out. Each branch walks to its own exit with a
            // per-branch ingest clone. Per-branch error isolation
            // (Task 4.1): wrap each branch dispatch in `tryCatchAsync` so a
            // throw in one branch does not reject the surrounding
            // `Promise.all` and starve siblings.
            // No-respond-across-many: respond ownership cannot be unambiguously
            // assigned when one inbound request fans out to N terminal flows.
            // Branches are dispatched with `respond: undefined`, and the
            // ChainResults returned to the outer aggregation are stripped of
            // any branch-internal respond so the outer fork's combined result
            // never propagates a branch's wrapped respond back to the caller.
            const branchResults = await Promise.all(
              forkIds.map((id) =>
                tryCatchAsync(runTransformerChain, (err) => {
                  collector.logger
                    .scope('transformer:many')
                    .error(`many branch ${id} failed`, { error: err });
                  return { event: null, respond: undefined };
                })(
                  collector,
                  transformers,
                  walkChain(id, extractTransformerNextMap(transformers)),
                  forkEvent,
                  cloneIngest(forkIngest, id),
                  undefined,
                  chainContext,
                ),
              ),
            );
            // Strip per-branch side-channels (respond, stopped) at the many
            // boundary. The outer aggregation only learns about events from
            // branch ChainResults; respond and stopped are branch-internal
            // concerns and must not leak back to the surrounding fork's
            // combined result.
            return branchResults.map(
              (br): Transformer.ChainResult => ({
                event: br.event,
                respond: undefined,
              }),
            );
          }

          // Fork continues through remaining chain
          if (remainingChain.length > 0) {
            return runTransformerChain(
              collector,
              transformers,
              remainingChain,
              forkEvent,
              forkIngest,
              currentRespond,
              chainContext,
            );
          }
          return { event: forkEvent, respond: currentRespond };
        }),
      );

      // Collect events from ChainResult objects and track last respond
      let lastForkRespond = currentRespond;
      const flatEvents: WalkerOS.DeepPartialEvent[] = [];
      for (const fr of forkResults.flat()) {
        if (fr === null) continue;
        if (fr && typeof fr === 'object' && 'event' in fr) {
          const cr = fr as Transformer.ChainResult;
          if (cr.respond) lastForkRespond = cr.respond;
          if (cr.event === null) continue;
          if (Array.isArray(cr.event)) flatEvents.push(...cr.event);
          else flatEvents.push(cr.event);
        } else {
          flatEvents.push(fr as WalkerOS.DeepPartialEvent);
        }
      }
      if (flatEvents.length === 0)
        return { event: null, respond: lastForkRespond };
      if (flatEvents.length === 1)
        return { event: flatEvents[0], respond: lastForkRespond };
      return { event: flatEvents, respond: lastForkRespond };
    }

    if (result && typeof result === 'object') {
      // Unified TransformerResult handling
      const { event: resultEvent, respond: resultRespond, next } = result;

      // Update respond if transformer provided a wrapper
      if (resultRespond) {
        currentRespond = resultRespond;
      }

      // Handle chain branching.
      //
      // Dispatch uses `getNextSteps`:
      // - []             → no route matched; passthrough (continue main chain
      //                    with resultEvent if provided).
      // - ['x']          → walk static .next from x and run that as a single
      //                    subchain. The branched subchain's ChainResult
      //                    becomes this transformer's final result; the main
      //                    chain terminates here (explicit routing wins).
      // - ['a','b',...]  → `many` fan-out. Terminal: each branch dispatches
      //                    as its own subchain with a per-branch ingest
      //                    clone. Main chain terminates here. Per-branch
      //                    error isolation arrives in Task 4.1; respond
      //                    suppression in 4.2.
      if (next !== undefined) {
        // Apply `state[set]` to the settled event before this step's `next`
        // dispatch, once for every branch that emits it.
        const settledEvent = await applyStateSet(resultEvent || processedEvent);
        const nextIds = getNextSteps(
          next,
          buildCacheContext(ingest, settledEvent),
        );
        if (nextIds.length === 0) {
          // No route matched → passthrough (continue chain)
          processedEvent = settledEvent;
          continue;
        }
        if (nextIds.length === 1) {
          const branchedChain = walkChain(
            nextIds[0],
            extractTransformerNextMap(transformers),
          );
          if (branchedChain.length > 0) {
            return runTransformerChain(
              collector,
              transformers,
              branchedChain,
              settledEvent,
              ingest,
              currentRespond,
              chainContext,
            );
          }
          // Branch target not found — drop event (fail-safe).
          collector.logger.warn(
            `Branch target not found: ${JSON.stringify(next)}`,
          );
          return { event: null, respond: currentRespond };
        }
        // many: terminal fan-out. Main chain terminates here. Per-branch
        // error isolation (Task 4.1): wrap each branch dispatch in
        // `tryCatchAsync` so a throw in one branch does not reject the
        // surrounding `Promise.all` and starve siblings.
        // No-respond-across-many: respond ownership cannot be unambiguously
        // assigned when one inbound request fans out to N terminal flows.
        // Branches are dispatched with `respond: undefined`, branch results
        // are awaited and discarded, and the outer return has
        // `respond: undefined` so the parent caller (source) sees no
        // wrapped respond.
        // No-stopped-across-many (Task 4.2 / regression-guarded by Task 4.3):
        // branch results — including any `stopped: true` from a nested
        // `cache.stop` HIT inside one branch — are discarded here. The outer
        // return omits `stopped`, so a cache.stop HIT in one branch does NOT
        // halt sibling branches. See the regression test
        // `transformer.test.ts > many: cache.stop in one branch does not
        // halt sibling branches`.
        await Promise.all(
          nextIds.map((id) =>
            tryCatchAsync(runTransformerChain, (err) => {
              collector.logger
                .scope('transformer:many')
                .error(`many branch ${id} failed`, { error: err });
              return { event: null, respond: undefined };
            })(
              collector,
              transformers,
              walkChain(id, extractTransformerNextMap(transformers)),
              settledEvent,
              cloneIngest(ingest, id),
              undefined,
              chainContext,
            ),
          ),
        );
        return { event: null, respond: undefined };
      }

      // Update event if provided
      if (resultEvent) {
        processedEvent = resultEvent;
      }
    }
    // If result is undefined (void), continue with current event unchanged

    // state[set]: write to the store from the settled event, after the
    // mapping and before the `next` dispatch.
    if (stateSet && stateSet.length > 0) {
      processedEvent = await applyState(
        stateSet,
        (id) => getStateStore(id, collector),
        processedEvent,
        collector,
      );
    }

    // Cache MISS: store the processed event after push
    if (cacheMiss && tCacheStore) {
      storeCache(tCacheStore, cacheMiss.key, processedEvent, cacheMiss.ttl);
    }

    // If transformer didn't return { next } but has a conditional
    // config.next (one / gate / sequence / many), resolve it per-request
    // via `getNextSteps`. Static (string / string[]) chains are wired
    // statically via the next-map and pre-baked into `chain` by the
    // caller (or by `walkChain` when an explicit chain array is passed);
    // re-dispatching them here would override an explicit caller chain.
    //
    // Dispatch (conditional variants only):
    // - []             → no match; chain ends here (passthrough).
    // - ['x']          → continue main chain via static walk from x.
    // - ['a','b',...]  → `many` fan-out. Terminal: each branch dispatches
    //                    as its own subchain with a per-branch ingest
    //                    clone. Main chain terminates here.
    const configNext = transformer.config.next;
    const isStaticConfigNext =
      typeof configNext === 'string' ||
      (Array.isArray(configNext) &&
        configNext.every((entry) => typeof entry === 'string'));
    const isConditionalConfigNext =
      configNext !== undefined && !isStaticConfigNext;
    if (
      (!result || (typeof result === 'object' && !result.next)) &&
      isConditionalConfigNext
    ) {
      const configNextIds = getNextSteps(
        transformer.config.next,
        buildCacheContext(ingest, processedEvent),
      );
      if (configNextIds.length === 1) {
        const continuationChain = walkChain(
          configNextIds[0],
          extractTransformerNextMap(transformers),
        );
        if (continuationChain.length > 0) {
          return runTransformerChain(
            collector,
            transformers,
            continuationChain,
            processedEvent,
            ingest,
            currentRespond,
            chainContext,
          );
        }
        // Target not found → chain ends here (passthrough)
        return { event: processedEvent, respond: currentRespond };
      }
      if (configNextIds.length > 1) {
        // many: terminal fan-out. Main chain terminates here. Per-branch
        // error isolation (Task 4.1): wrap each branch dispatch in
        // `tryCatchAsync` so a throw in one branch does not reject the
        // surrounding `Promise.all` and starve siblings.
        // No-respond-across-many: respond ownership cannot be unambiguously
        // assigned when one inbound request fans out to N terminal flows.
        // Branches are dispatched with `respond: undefined`, branch results
        // are awaited and discarded, and the outer return has
        // `respond: undefined` so the parent caller (source) sees no
        // wrapped respond.
        await Promise.all(
          configNextIds.map((id) =>
            tryCatchAsync(runTransformerChain, (err) => {
              collector.logger
                .scope('transformer:many')
                .error(`many branch ${id} failed`, { error: err });
              return { event: null, respond: undefined };
            })(
              collector,
              transformers,
              walkChain(id, extractTransformerNextMap(transformers)),
              processedEvent,
              cloneIngest(ingest, id),
              undefined,
              chainContext,
            ),
          ),
        );
        return { event: null, respond: undefined };
      }
      // configNextIds.length === 0: no match → chain ends here
      return { event: processedEvent, respond: currentRespond };
    }
  }

  return { event: processedEvent, respond: currentRespond };
}

/**
 * Merges transformer environments.
 */
function mergeTransformerEnvironments(
  configEnv?: Transformer.Env,
): Transformer.Env {
  if (!configEnv) return {};
  if (isObject(configEnv)) return configEnv;
  return {};
}
