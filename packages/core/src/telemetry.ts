import type { Hooks } from './types';
import type { FlowState, FlowStatePhase } from './types/telemetry';

/**
 * Telemetry level. Off disables emission entirely (the helper returns an
 * empty hooks object). Standard emits structural state without inEvent or
 * outEvent payloads. Trace emits full payloads on every hop.
 */
export type TelemetryLevel = 'off' | 'standard' | 'trace';

/**
 * Options that shape the telemetry emission strategy. Defaults are chosen
 * so a caller can pass `{ flowId, startedAt }` and get sensible behavior.
 */
export interface TelemetryOptions {
  /** Required flow identifier; written into every emitted FlowState. */
  flowId: string;
  /**
   * Monotonic origin used to compute `elapsedMs`. Pass the runtime's start
   * time (e.g. `Date.now()` captured once at boot). Defaults to the moment
   * `createTelemetryHooks` is called if omitted, which is acceptable for
   * short-lived simulations but not for long-running collectors.
   */
  startedAt?: number;
  /** Verbosity. Defaults to 'standard'. */
  level?: TelemetryLevel;
  /** Force-include the inbound event regardless of level. */
  includeIn?: boolean;
  /** Force-include the outbound event regardless of level. */
  includeOut?: boolean;
  /** Force-include the matched mapping key (only meaningful for transformers). */
  includeMappingKey?: boolean;
  /**
   * Fraction of events to emit, between 0 and 1. Deterministic by event id:
   * the same event id always falls on the same side of the threshold so
   * paired in/out states either both emit or both drop.
   */
  sample?: number;
}

type EmitFn = (state: FlowState) => void;

/**
 * Deterministic 32-bit FNV-1a hash of a string. Used for sampling so
 * identical eventIds always map to the same numeric bucket.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash =
      (hash +
        ((hash << 1) +
          (hash << 4) +
          (hash << 7) +
          (hash << 8) +
          (hash << 24))) >>>
      0;
  }
  return hash >>> 0;
}

/**
 * Returns true when the eventId passes the sample gate. Sample of 1 always
 * passes; sample of 0 always fails. Anything in between buckets the eventId
 * deterministically so the in/out pair is consistent.
 */
function passesSample(eventId: string, sample: number): boolean {
  if (sample >= 1) return true;
  if (sample <= 0) return false;
  const hashed = fnv1a(eventId);
  const ratio = hashed / 0xffffffff;
  return ratio < sample;
}

interface MaybeId {
  id?: unknown;
}

interface MaybeConsent {
  consent?: unknown;
}

interface MaybeRule {
  rule?: { key?: unknown };
}

interface MaybeMapping {
  mapping?: { key?: unknown };
}

interface MaybeEntries {
  entries?: unknown;
}

interface MaybeThen {
  then?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readId(value: unknown): string {
  if (!isPlainObject(value)) return '';
  const id = (value as MaybeId).id;
  return typeof id === 'string' ? id : '';
}

function readConsent(value: unknown): Record<string, boolean> | undefined {
  if (!isPlainObject(value)) return undefined;
  const consent = (value as MaybeConsent).consent;
  if (!isPlainObject(consent)) return undefined;
  // Narrow each value to boolean defensively without casting the bag.
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(consent)) {
    if (typeof v === 'boolean') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readContextId(ctx: unknown): string | undefined {
  if (!isPlainObject(ctx)) return undefined;
  const id = (ctx as MaybeId).id;
  return typeof id === 'string' ? id : undefined;
}

function readMappingKey(
  ctx: unknown,
  source: 'rule' | 'mapping',
): string | undefined {
  if (!isPlainObject(ctx)) return undefined;
  if (source === 'rule') {
    const rule = (ctx as MaybeRule).rule;
    if (!isPlainObject(rule)) return undefined;
    const key = rule.key;
    return typeof key === 'string' ? key : undefined;
  }
  const mapping = (ctx as MaybeMapping).mapping;
  if (!isPlainObject(mapping)) return undefined;
  const key = mapping.key;
  return typeof key === 'string' ? key : undefined;
}

function readBatchSize(batch: unknown): number {
  if (!isPlainObject(batch)) return 0;
  const entries = (batch as MaybeEntries).entries;
  return Array.isArray(entries) ? entries.length : 0;
}

function isThenable(value: unknown): value is Promise<unknown> {
  if (!isPlainObject(value)) return false;
  return typeof (value as MaybeThen).then === 'function';
}

/**
 * Normalize a thrown value into the FlowState error shape. Non-Error
 * throws (strings, plain objects) get their message coerced via String()
 * so observers always see a printable message.
 */
function normalizeError(err: unknown): { name?: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { message: String(err) };
}

/**
 * Build a telemetry hooks bag wired against the collector's `useHooks`
 * machinery. The returned object is passed straight to
 * `collector.hooks` (or merged with existing hooks). Each hook emits one
 * or two FlowState records via `emit`, capturing inbound payload on the
 * pre-hook and outbound payload (or error) on the post-hook.
 *
 * Pre and post hook calls receive separate `params` objects, so duration
 * tracking keys off the wrapped function reference (`params.fn`) via a
 * WeakMap. Two concurrent calls against the same wrapped fn share a key,
 * which is acceptable: the post-hook only needs an approximate start.
 *
 * The implementation is intentionally side-effect free apart from `emit`:
 * a throwing emit is swallowed so observers cannot crash the pipeline.
 */
export function createTelemetryHooks(
  emit: EmitFn,
  opts: TelemetryOptions,
  registeredStoreIds: string[] = [],
): Hooks.Functions {
  const level: TelemetryLevel = opts.level ?? 'standard';
  if (level === 'off') return {};

  const flowId = opts.flowId;
  const startedAt = opts.startedAt ?? Date.now();
  const sample = opts.sample ?? 1;
  const includeIn = opts.includeIn ?? level === 'trace';
  const includeOut = opts.includeOut ?? level === 'trace';
  const includeMappingKey = opts.includeMappingKey ?? level === 'trace';

  function nowMs(): number {
    return Date.now();
  }

  function baseState(
    stepId: string,
    stepType: FlowState['stepType'],
    phase: FlowStatePhase,
    eventId: string,
    at: number,
  ): FlowState {
    return {
      flowId,
      stepId,
      stepType,
      phase,
      eventId,
      timestamp: new Date(at).toISOString(),
      elapsedMs: at - startedAt,
    };
  }

  function safeEmit(state: FlowState): void {
    try {
      emit(state);
    } catch {
      // Observers must not crash the pipeline; swallow.
    }
  }

  const hooks: Hooks.Functions = {};

  // Pre/post correlation: each pre call records its start against
  // `params.fn` (stable across pre and post for a given useHooks wrap).
  // Concurrent calls overwrite; durationMs becomes approximate under
  // contention. That trade-off keeps the implementation tiny and avoids
  // synthesizing per-call tokens.
  const starts = new WeakMap<object, number>();

  function recordStart(fn: object, started: number): void {
    starts.set(fn, started);
  }

  function readStart(fn: object): number | undefined {
    return starts.get(fn);
  }

  function registerEventPair(
    name: string,
    stepIdFor: (args: unknown[]) => string,
    stepType: FlowState['stepType'],
    mappingKeySource?: 'rule' | 'mapping',
  ): void {
    const preName = 'pre' + name;
    const postName = 'post' + name;

    hooks[preName] = (
      params: { fn: (...args: unknown[]) => unknown },
      ...args: unknown[]
    ): unknown => {
      const event = args[0];
      const eventId = readId(event);
      const started = nowMs();
      recordStart(params.fn, started);
      if (passesSample(eventId, sample)) {
        const state = baseState(
          stepIdFor(args),
          stepType,
          'in',
          eventId,
          started,
        );
        if (includeIn) state.inEvent = event;
        const consent = readConsent(event);
        if (consent) state.consent = consent;
        if (includeMappingKey && mappingKeySource) {
          const key = readMappingKey(args[1], mappingKeySource);
          if (key) state.mappingKey = key;
        }
        safeEmit(state);
      }
      return params.fn(...args);
    };

    hooks[postName] = (
      params: {
        fn: (...args: unknown[]) => unknown;
        result?: unknown;
      },
      ...args: unknown[]
    ): unknown => {
      const event = args[0];
      const eventId = readId(event);
      const started = readStart(params.fn) ?? nowMs();
      const result = params.result;

      if (!passesSample(eventId, sample)) return result;

      if (isThenable(result)) {
        result.then(
          (resolved) => {
            const finished = nowMs();
            const state = baseState(
              stepIdFor(args),
              stepType,
              'out',
              eventId,
              finished,
            );
            state.durationMs = finished - started;
            if (includeOut) state.outEvent = resolved;
            safeEmit(state);
          },
          (err) => {
            const finished = nowMs();
            const state = baseState(
              stepIdFor(args),
              stepType,
              'error',
              eventId,
              finished,
            );
            state.durationMs = finished - started;
            state.error = normalizeError(err);
            safeEmit(state);
          },
        );
        return result;
      }

      const finished = nowMs();
      const state = baseState(
        stepIdFor(args),
        stepType,
        'out',
        eventId,
        finished,
      );
      state.durationMs = finished - started;
      if (includeOut) state.outEvent = result;
      safeEmit(state);
      return result;
    };
  }

  // Collector push: `[event, options?]`; stepId is fixed.
  registerEventPair('Push', () => 'collector.push', 'collector');

  // Destination push: `[event, context]` where context.id carries the
  // destination id. Mapping key is read from `context.rule.key`.
  registerEventPair(
    'DestinationPush',
    (args) => `destination.${readContextId(args[1]) ?? 'unknown'}`,
    'destination',
    'rule',
  );

  // Destination init: `[context]`; no event payload. Emit only an 'init'
  // phase entry; errors propagate through the normal hook machinery.
  hooks.preDestinationInit = (
    params: { fn: (...args: unknown[]) => unknown },
    ...args: unknown[]
  ): unknown => {
    const id = readContextId(args[0]) ?? 'unknown';
    const state = baseState(
      `destination.${id}`,
      'destination',
      'init',
      '',
      nowMs(),
    );
    safeEmit(state);
    return params.fn(...args);
  };

  // Destination push batch: `[batch, context]`. Emit a 'flush' state
  // with batch.size; per-entry observation belongs to the post-collector
  // chain.
  hooks.preDestinationPushBatch = (
    params: { fn: (...args: unknown[]) => unknown },
    ...args: unknown[]
  ): unknown => {
    const batch = args[0];
    const ctx = args[1];
    const id = readContextId(ctx) ?? 'unknown';
    const size = readBatchSize(batch);
    const state = baseState(
      `destination.${id}`,
      'destination',
      'flush',
      '',
      nowMs(),
    );
    state.batch = { size, index: 0 };
    safeEmit(state);
    return params.fn(...args);
  };

  // Transformer push: `[event, context]`. Mapping key is read from
  // `context.mapping.key`.
  registerEventPair(
    'TransformerPush',
    (args) => `transformer.${readContextId(args[1]) ?? 'unknown'}`,
    'transformer',
    'mapping',
  );

  // Store hooks are wrapped per-store via `applyStoreHooks` in
  // packages/collector/src/store.ts so the hook name carries the store id
  // (e.g. `preStoreGet_gcs`). The telemetry helper subscribes once per
  // store id passed in `registeredStoreIds`. The wrapped store fns take
  // `(key)`, `(key, value, ttl?)`, or `(key)`; no event object is
  // available, so we emit `meta.key` (and `meta.value` on set) and use an
  // empty string for eventId.
  for (const storeId of registeredStoreIds) {
    const stepId = `store.${storeId}`;

    const registerStorePair = (
      hookBase: string,
      op: 'get' | 'set' | 'delete',
    ): void => {
      const tokens = new WeakMap<object, number>();
      hooks['pre' + hookBase] = (
        params: { fn: (...args: unknown[]) => unknown },
        ...args: unknown[]
      ): unknown => {
        const started = nowMs();
        tokens.set(params.fn, started);
        const key = args[0];
        const state = baseState(stepId, 'store', 'in', '', started);
        const meta: Record<string, unknown> = { op };
        if (typeof key === 'string') meta.key = key;
        if (op === 'set') meta.value = args[1];
        state.meta = meta;
        safeEmit(state);
        return params.fn(...args);
      };

      hooks['post' + hookBase] = (
        params: {
          fn: (...args: unknown[]) => unknown;
          result?: unknown;
        },
        ...args: unknown[]
      ): unknown => {
        const key = args[0];
        const started = tokens.get(params.fn) ?? nowMs();
        const result = params.result;
        const emitOut = (resolved: unknown): void => {
          const finished = nowMs();
          const state = baseState(stepId, 'store', 'out', '', finished);
          state.durationMs = finished - started;
          const meta: Record<string, unknown> = { op };
          if (typeof key === 'string') meta.key = key;
          if (op === 'get' && includeOut) meta.value = resolved;
          state.meta = meta;
          safeEmit(state);
        };
        const emitErr = (err: unknown): void => {
          const finished = nowMs();
          const state = baseState(stepId, 'store', 'error', '', finished);
          state.durationMs = finished - started;
          state.error = normalizeError(err);
          const meta: Record<string, unknown> = { op };
          if (typeof key === 'string') meta.key = key;
          state.meta = meta;
          safeEmit(state);
        };

        if (isThenable(result)) {
          result.then(emitOut, emitErr);
          return result;
        }
        emitOut(result);
        return result;
      };
    };

    registerStorePair('StoreGet_' + storeId, 'get');
    registerStorePair('StoreSet_' + storeId, 'set');
    registerStorePair('StoreDelete_' + storeId, 'delete');

    // Cache status observation: the wrapped cache layer fires
    // `StoreCacheRead_<id>` on every wrapped get, passing the key and the
    // resolved status. Emit a single 'in' state per call carrying
    // `meta.cached` so observers can correlate the surrounding StoreGet
    // pair with the cache HIT/MISS decision.
    hooks['postStoreCacheRead_' + storeId] = (
      params: {
        fn: (...args: unknown[]) => unknown;
        result?: unknown;
      },
      ...args: unknown[]
    ): unknown => {
      const key = args[0];
      const status = params.result;
      const state = baseState(stepId, 'store', 'in', '', nowMs());
      const meta: Record<string, unknown> = {
        op: 'cache',
        cached: status === 'hit',
      };
      if (typeof key === 'string') meta.key = key;
      if (typeof status === 'string') meta.status = status;
      state.meta = meta;
      safeEmit(state);
      return params.result;
    };
  }

  return hooks;
}

/**
 * Convenience export: the internal sampling predicate so callers (and
 * tests) can verify the deterministic bucketing without importing the
 * private FNV-1a helper.
 */
export function isSampled(eventId: string, sample: number): boolean {
  return passesSample(eventId, sample);
}
