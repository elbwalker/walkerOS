/**
 * @module transformer
 *
 * Transformer Chains
 * ==================
 *
 * The one chain runner of walkerOS. Every chain position (`source.before`,
 * `source.next`, `transformer.before`, `destination.before`,
 * `destination.next`) and the CLI simulation run through
 * `runTransformerChain`.
 *
 * A chain starts from a Route (or a continuation of one). The runner loops
 * `advanceChain` from `@walkeros/core`, which resolves the route hop by hop
 * with the root the previous step left (`{ ingest, event }`):
 *
 * - `run`: the member runs (cache, `before`, `state`, push); its own `next`
 *   is inserted right after it, then the explicit array continues.
 * - `fork` (a `many`, or a transformer returning `Result[]`): each copy
 *   finishes the whole rest of the path on its own, with its own span id
 *   (`deriveSpanId`) and a cloned ingest. Copies never merge; every finished
 *   copy is handed back as its own event.
 * - `stop`: the running copy ends (`copies: []`, `stopped: true`).
 *
 * Chain termination per member:
 * - returns false or throws: the copy is dropped (`droppedBy`)
 * - returns void: continue with the unchanged event
 * - returns `{ event }`: continue with the new event
 * - returns `{ next }`: that route runs right after the member, in place of
 *   the member's own `next`, then the array continues
 */
import type {
  Cache,
  ChainContinuation,
  Collector,
  RespondFn,
  Transformer,
  WalkerOS,
  Ingest,
} from '@walkeros/core';
import {
  advanceChain,
  clone,
  createIngest,
  deriveSpanId,
  emitStep,
  FatalError,
  isChainContinuation,
  isObject,
  startChain,
  stepId,
  tryCatchAsync,
  useHooks,
  compileCache,
  checkCache,
  storeCache,
  createMappingRoot,
  validateStepEntry,
  processEventMapping,
  compileState,
  applyState,
} from '@walkeros/core';
import { buildBaseState, journeyFields } from './observerEmit';
import { getCacheStore, getStateStore } from './cache';
import { buildReportError, errorMeta } from './report-error';

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
 * Clone an ingest for an independent copy (a fork). The top level and
 * `_meta` are shallow-copied and `_meta.path` is duplicated, so the path
 * budget and hop count of one copy never leak into a sibling.
 */
export function cloneIngest(ingest: Ingest): Ingest {
  return {
    ...ingest,
    _meta: { ...ingest._meta, path: [...ingest._meta.path] },
  };
}

/** Safety valve against unbounded path growth, per copy. */
const MAX_PATH_LENGTH = 256;

/** What every copy of one chain run shares. */
interface ChainRun {
  collector: Collector.Instance;
  transformers: Transformer.Transformers;
  chainContext?: string;
}

/** A cache MISS of a member, written once the member settled. */
interface CacheMiss {
  key: string;
  ttl: number;
}

/** A member about to run, as `advanceChain` handed it out. */
interface Member {
  id: string;
  ancestry: readonly string[];
  /** The stack after the member; carries its own `next` on top if any. */
  rest: ChainContinuation;
  /** Whether `rest` carries the member's own `next` on top. */
  ownNext: boolean;
}

/**
 * A member that resumes after its `before` chain fanned out: each child
 * runs the member's own push (no second `before`, path and cache already
 * accounted for by the parent copy).
 */
interface Resume {
  member: Member;
  cacheMiss?: CacheMiss;
}

/** One independent copy of the event walking the chain. */
interface Copy {
  stack: ChainContinuation;
  event: WalkerOS.DeepPartialEvent;
  ingest: Ingest;
  respond: RespondFn | undefined;
  resume?: Resume;
}

type MemberOutcome =
  | { kind: 'halt'; result: Transformer.ChainResult }
  | { kind: 'fork'; copies: Copy[] }
  | {
      kind: 'continue';
      event: WalkerOS.DeepPartialEvent;
      respond: RespondFn | undefined;
      stack: ChainContinuation;
    };

/** The event's id, or '' when it has none. */
function idOf(event: WalkerOS.DeepPartialEvent): string {
  return typeof event.id === 'string' ? event.id : '';
}

/**
 * Identity along one copy: an event a member handed on without an id (a
 * rebuilt event, a mock, a cached value) is still the event the member
 * received, so it keeps that id. The one identity rule for a single path;
 * forks derive theirs in `forkOf`.
 */
function keepIdentity(
  received: WalkerOS.DeepPartialEvent,
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.DeepPartialEvent {
  const id = idOf(received);
  return id !== '' && idOf(event) === '' ? { ...event, id } : event;
}

/**
 * A fork child: a deep copy of the event (siblings run concurrently and
 * must never share nested objects), with its own cloned ingest. A child
 * still carrying the parent's id (or no id) gets a span id derived from the
 * parent id and its position, so forks never collapse on `event.id`; a
 * child with an id of its own keeps it. The ingest records the parent as
 * `parentEventId`, which links the fork into the parent's journey.
 */
function forkOf(
  parent: WalkerOS.DeepPartialEvent,
  child: WalkerOS.DeepPartialEvent,
  ingest: Ingest,
  position: number,
): { event: WalkerOS.DeepPartialEvent; ingest: Ingest } {
  const forkIngest = cloneIngest(ingest);
  const event = clone(child);
  const parentId = idOf(parent);
  if (parentId === '') return { event, ingest: forkIngest };
  forkIngest._meta.parentEventId = parentId;
  const childId = idOf(event);
  if (childId === '' || childId === parentId)
    event.id = deriveSpanId(parentId, position);
  return { event, ingest: forkIngest };
}

/** A finished result: every copy that continues, with its ingest. */
function finished(
  copies: Transformer.ChainCopy[],
  respond: RespondFn | undefined,
): Transformer.ChainResult {
  return { copies, respond };
}

/** The stack after a member, with a route pushed on its behalf. */
function withMemberRoute(
  member: Member,
  route: Transformer.Route | undefined,
): ChainContinuation {
  if (route === undefined) return member.rest;
  // A route the member returned replaces the member's own `next`.
  const below = member.ownNext ? member.rest.slice(1) : member.rest;
  return [{ route, ancestry: member.ancestry }, ...below];
}

/**
 * Runs every copy of a fork to its end, each isolated (a throw in one copy
 * never starves its siblings). Finished copies are handed back one by one;
 * a copy that was dropped or stopped contributes nothing. A copy started
 * without `respond` cannot hand a respond back (no respond across `many`).
 */
async function runForks(
  run: ChainRun,
  copies: Copy[],
  respond: RespondFn | undefined,
): Promise<Transformer.ChainResult> {
  const results = await Promise.all(
    copies.map((copy, index) =>
      tryCatchAsync(runCopy, (err): Transformer.ChainResult => {
        run.collector.logger
          .scope('transformer:fork')
          .error(`fork ${index} failed`, errorMeta(err));
        return { copies: [] };
      })(run, copy),
    ),
  );

  const survivors: Transformer.ChainCopy[] = [];
  let lastRespond = respond;
  let allStopped = results.length > 0;
  let droppedBy: string | undefined;
  results.forEach((result, index) => {
    if (copies[index].respond !== undefined && result.respond)
      lastRespond = result.respond;
    if (!result.stopped) allStopped = false;
    // A dropped or stopped copy (route stop or cache.stop halt) ends here.
    if (result.stopped || result.copies.length === 0) {
      if (droppedBy === undefined) droppedBy = result.droppedBy;
      return;
    }
    survivors.push(...result.copies);
  });

  if (survivors.length === 0) {
    return {
      copies: survivors,
      respond: lastRespond,
      ...(allStopped ? { stopped: true as const } : {}),
      ...(droppedBy !== undefined ? { droppedBy } : {}),
    };
  }
  return finished(survivors, lastRespond);
}

/** Walks one copy to its end: loops `advanceChain`, runs each member. */
async function runCopy(
  run: ChainRun,
  copy: Copy,
): Promise<Transformer.ChainResult> {
  const { ingest } = copy;
  let { stack, event, respond } = copy;
  let resume = copy.resume;

  for (;;) {
    let member: Member;
    let resumed: Resume | undefined;
    if (resume) {
      member = resume.member;
      resumed = resume;
      resume = undefined;
    } else {
      const step = advanceChain(
        stack,
        createMappingRoot(ingest, event),
        run.transformers,
      );
      if (step.kind === 'done') return finished([{ event, ingest }], respond);
      if (step.kind === 'stop') {
        return {
          copies: [],
          respond,
          stopped: true,
          ...(step.owner !== undefined ? { droppedBy: step.owner } : {}),
        };
      }
      if (step.kind === 'fork') {
        const parent = event;
        return runForks(
          run,
          step.branches.map((branch, position) => ({
            stack: branch,
            ...forkOf(parent, parent, ingest, position),
            respond: undefined,
          })),
          respond,
        );
      }
      const transformer = run.transformers[step.id];
      member = {
        id: step.id,
        ancestry: step.ancestry,
        rest: step.rest,
        ownNext: transformer ? transformer.config.next !== undefined : false,
      };
    }

    const outcome = await runMember(
      run,
      member,
      event,
      ingest,
      respond,
      resumed,
    );
    if (outcome.kind === 'halt') return outcome.result;
    if (outcome.kind === 'fork') return runForks(run, outcome.copies, respond);
    event = outcome.event;
    respond = outcome.respond;
    stack = outcome.stack;
  }
}

/**
 * Runs one member: path accounting, init, mocks, cache, its `before` chain,
 * `state`, the push, and the result handling. Returns how the copy goes on.
 */
async function runMember(
  run: ChainRun,
  member: Member,
  event: WalkerOS.DeepPartialEvent,
  ingest: Ingest,
  respond: RespondFn | undefined,
  resumed: Resume | undefined,
): Promise<MemberOutcome> {
  const { collector, transformers, chainContext } = run;
  const transformerName = member.id;
  const transformer = transformers[transformerName];
  let processedEvent = event;
  let currentRespond = respond;
  const goOn = (stack: ChainContinuation = member.rest): MemberOutcome => ({
    kind: 'continue',
    event: keepIdentity(event, processedEvent),
    respond: currentRespond,
    stack,
  });
  // A dropped or route-stopped copy hands nothing on (`copies: []`); a
  // `cache.stop` halt hands its cached copy on, flagged `stopped`, for the
  // caller to decide.
  const halt = (result: Transformer.ChainResult): MemberOutcome => ({
    kind: 'halt',
    result,
  });

  if (!transformer) {
    collector.logger.warn(`Transformer not found: ${transformerName}`);
    return goOn();
  }

  // Compile transformer cache once (reused for HIT check and MISS store).
  // Transformer caches operate on events (step-level HIT/MISS keyed by event
  // fields), so the rule shape is always EventCacheRule, not StoreCacheRule.
  const tCacheConfig = transformer.config?.cache as
    | Cache.Cache<Cache.EventCacheRule>
    | undefined;
  const compiledTCache = tCacheConfig ? compileCache(tCacheConfig) : undefined;
  const tCacheStore = compiledTCache
    ? getCacheStore(compiledTCache, collector)
    : undefined;

  let cacheMiss: CacheMiss | undefined = resumed?.cacheMiss;

  if (!resumed) {
    // Safety valve: prevent unbounded path growth
    if (ingest._meta.path.length > MAX_PATH_LENGTH) {
      collector.logger.error(`Max path length exceeded at ${transformerName}`);
      return halt({ copies: [], respond: currentRespond });
    }

    // Track step in _meta (runtime-managed)
    ingest._meta.hops++;
    ingest._meta.path.push(transformerName);

    // Initialize transformer if needed. The wrap surfaces a thrown init
    // (misconfiguration, missing env, etc.) with full cause via the scoped
    // logger and counts it on `status.failed`. A non-throw `false` return
    // from transformerInit itself flows through the same early return below.
    const isInitialized = await tryCatchAsync(
      transformerInit,
      (err: unknown): boolean => {
        if (err instanceof FatalError) throw err;
        collector.status.failed++;
        collector.logger
          .scope(`transformer:${transformer.type || 'unknown'}`)
          .error('transformer init failed', {
            transformer: transformerName,
            ...errorMeta(err),
          });
        return false;
      },
    )(collector, transformer, transformerName);

    if (!isInitialized) return halt({ copies: [], respond: currentRespond });

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
      return goOn();
    }

    // Global mock check
    if (transformer.config?.mock !== undefined) {
      collector.logger
        .scope(`transformer:${transformer.type || 'unknown'}`)
        .debug('mock');
      processedEvent = transformer.config.mock as WalkerOS.DeepPartialEvent;
      return goOn();
    }

    // Disabled check
    if (transformer.config?.disabled) return goOn();

    // Check transformer cache (step-level: skip push, continue chain)
    if (compiledTCache && tCacheStore) {
      const cacheResult = await checkCache(
        compiledTCache,
        tCacheStore,
        createMappingRoot(ingest, processedEvent),
      );

      if (cacheResult?.status === 'HIT' && cacheResult.value) {
        processedEvent = cacheResult.value as WalkerOS.DeepPartialEvent;
        // stop=true: stop the chain AND halt the pipeline at this position.
        // Callers branch on `stopped` to skip downstream stages.
        if (compiledTCache.stop) {
          const cached = keepIdentity(event, processedEvent);
          return halt({
            copies: [{ event: cached, ingest }],
            respond: currentRespond,
            stopped: true,
          });
        }
        return goOn(); // stop=false: next member
      }

      if (cacheResult?.status === 'MISS') {
        cacheMiss = { key: cacheResult.key, ttl: cacheResult.rule.ttl };
      }
    }

    // The member's `before` chain (mandatory preparation).
    if (transformer.config.before !== undefined) {
      const before = await runTransformerBefore(
        collector,
        transformers,
        transformerName,
        processedEvent,
        ingest,
        currentRespond,
        chainContext,
      );
      const beforeRespond = before.respond ?? currentRespond;
      // Dropped, stopped, or a nested `cache.stop: true` HIT: the copy halts
      // with what the before chain handed back.
      if (before.copies.length === 0 || before.stopped) {
        return halt({ ...before, respond: beforeRespond });
      }
      currentRespond = beforeRespond;
      const [first] = before.copies;
      if (before.copies.length > 1 || first.ingest !== ingest) {
        // The before chain forked: every surviving copy runs this member and
        // the rest of the path as its own copy, with its own ingest and id
        // (both set by the fork inside the before chain).
        const resume: Resume = { member, cacheMiss };
        return {
          kind: 'fork',
          copies: before.copies.map((copy) => ({
            stack: member.rest,
            event: copy.event,
            ingest: copy.ingest,
            respond: undefined,
            resume,
          })),
        };
      }
      processedEvent = first.event;
    }
  }

  // Compile declarative state entries. `get` runs before the push (so the
  // mapping can read fetched values); `set` runs after the push settled the
  // event and before the member's route resolves.
  const stateEntries = transformer.config?.state
    ? compileState(transformer.config.state)
    : undefined;
  const stateGet = stateEntries?.filter((entry) => entry.mode === 'get');
  const stateSet = stateEntries?.filter((entry) => entry.mode === 'set');

  const applyStateSet = async (
    evt: WalkerOS.DeepPartialEvent,
  ): Promise<WalkerOS.DeepPartialEvent> => {
    if (!stateSet || stateSet.length === 0) return evt;
    return applyState(
      stateSet,
      (id) => getStateStore(id, collector),
      evt,
      collector,
      ingest,
    );
  };

  if (stateGet && stateGet.length > 0) {
    processedEvent = await applyState(
      stateGet,
      (id) => getStateStore(id, collector),
      processedEvent,
      collector,
      ingest,
    );
  }

  // Run the transformer
  const result = await tryCatchAsync(transformerPush, (err) => {
    collector.status.failed++;
    collector.logger
      .scope(`transformer:${transformer.type || 'unknown'}`)
      .error('Push failed', errorMeta(err));
    return false as const; // Stop chain on error
  })(
    collector,
    transformer,
    transformerName,
    processedEvent,
    ingest,
    currentRespond,
  );

  // Returned false, or threw and was converted to false above.
  if (result === false) {
    return halt({
      copies: [],
      respond: currentRespond,
      droppedBy: transformerName,
    });
  }

  // `Result[]`: every result is a fork that finishes the rest of the path.
  if (Array.isArray(result) && result.length !== 1) {
    if (result.length === 0)
      return halt({ copies: [], respond: currentRespond });
    const parent = processedEvent;
    const copies: Copy[] = [];
    for (let position = 0; position < result.length; position++) {
      const forkResult = result[position];
      const settled = await applyStateSet(forkResult.event || parent);
      copies.push({
        stack: withMemberRoute(member, forkResult.next),
        ...forkOf(parent, settled, ingest, position),
        respond: currentRespond,
      });
    }
    return { kind: 'fork', copies };
  }

  // One result (a one-element `Result[]` continues in place, like a `many`
  // with one match).
  const single = Array.isArray(result) ? result[0] : result;
  let resultNext: Transformer.Route | undefined;
  if (single && typeof single === 'object') {
    if (single.respond) currentRespond = single.respond;
    if (single.event) processedEvent = single.event;
    resultNext = single.next;
  }

  processedEvent = await applyStateSet(processedEvent);

  // Cache MISS: store the processed event after push
  if (cacheMiss && tCacheStore) {
    storeCache(tCacheStore, cacheMiss.key, processedEvent, cacheMiss.ttl);
  }

  return goOn(withMemberRoute(member, resultNext));
}

/**
 * Runs an event through a chain: the one chain runner.
 *
 * @param collector - The collector instance with transformers
 * @param transformers - Map of transformer instances
 * @param start - The route to run (a chain field such as `source.next`), or
 *   a continuation of one; `undefined` runs nothing
 * @param event - The event to process
 * @param ingest - Mutable ingest context flowing through the pipeline
 * @param respond - The respond function in scope
 * @param chainContext - Chain path (e.g. `destination.ga4.before`), recorded
 *   as `ingest._meta.chainPath` and keying `chainMocks`
 * @returns Every finished copy with its own ingest (`copies`, empty when
 *   dropped or stopped) and the respond in scope afterwards
 */
export async function runTransformerChain(
  collector: Collector.Instance,
  transformers: Transformer.Transformers,
  start: Transformer.Route | ChainContinuation | undefined,
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: RespondFn,
  chainContext?: string,
): Promise<Transformer.ChainResult> {
  // Ensure an ingest exists so the per-copy path budget engages regardless
  // of the caller.
  const chainIngest =
    ingest ?? createIngest(typeof start === 'string' ? start : 'chain');
  if (start === undefined)
    return finished([{ event, ingest: chainIngest }], respond);
  if (chainContext) chainIngest._meta.chainPath = chainContext;

  return runCopy(
    { collector, transformers, chainContext },
    {
      stack: isChainContinuation(start) ? start : startChain(start),
      event,
      ingest: chainIngest,
      respond,
    },
  );
}

/**
 * Runs a transformer's `before` chain: the one implementation, used by the
 * chain runner for every member and by the CLI simulation. A `stop` that
 * the before route itself resolved is attributed to the transformer.
 */
export async function runTransformerBefore(
  collector: Collector.Instance,
  transformers: Transformer.Transformers,
  transformerId: string,
  event: WalkerOS.DeepPartialEvent,
  ingest?: Ingest,
  respond?: RespondFn,
  chainContext?: string,
): Promise<Transformer.ChainResult> {
  const transformer = transformers[transformerId];
  const before = transformer ? transformer.config.before : undefined;
  const result = await runTransformerChain(
    collector,
    transformers,
    before,
    event,
    ingest,
    respond,
    chainContext,
  );
  if (result.stopped && result.copies.length === 0 && !result.droppedBy)
    return { ...result, droppedBy: transformerId };
  return result;
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
