import type {
  Collector,
  On,
  WalkerOS,
  Destination,
  Source,
} from '@walkeros/core';
import { isArray, FatalError } from '@walkeros/core';
import { Const } from './constants';
import { tryCatch, tryCatchAsync } from '@walkeros/core';
import { mergeEnvironments } from './destination';
import { reconcilePending } from './pending';
import { flushSourceQueueOn, isSourceStarted } from './source';

type OnCallbackKind =
  | 'destination'
  | 'generic'
  | 'source'
  | 'consent'
  | 'ready'
  | 'run'
  | 'session';

/**
 * Log a thrown error from a user-supplied `on` callback.
 *
 * Category B (user code): visibility via the scoped 'on' logger only.
 * `status.failed` is reserved for pipeline failures and stays untouched
 * here so it remains a clean health signal.
 *
 * Rethrows `FatalError` to let runtime supervisors fail fast on explicit
 * abort signals. Both `tryCatch` and `tryCatchAsync` propagate throws
 * raised inside onError, so this rethrow surfaces at the caller.
 */
function logOnCallbackError(
  collector: Collector.Instance,
  kind: OnCallbackKind,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  if (error instanceof FatalError) throw error;
  collector.logger.scope('on').error('on callback failed', {
    kind,
    ...extra,
    error,
  });
}

/**
 * State-delivery event types: the reactive-state commands that bump
 * `collector.stateVersion` (see handle.ts). These are the only deliveries
 * subject to the per-subscriber high-water-mark + `allowed` gate. Lifecycle
 * types (ready/run/session) and non-reactive config keep their own gating
 * (onReady/onRun check `allowed`, onSession checks `session`).
 */
export function isStateDelivery(type: On.Types): boolean {
  return (
    type === Const.Commands.Consent ||
    type === Const.Commands.User ||
    type === Const.Commands.Globals ||
    type === Const.Commands.Custom
  );
}

/**
 * Is a recorded state CELL present (non-empty)? The single source of truth for
 * "cell X has a value", shared by `isRequireSatisfied` (require gating) and
 * `redeliverStateAtRun` (run-barrier re-delivery) so the presence semantics
 * never drift between the two. PRESENCE, not grant: a denied consent
 * (`{marketing:false}`) counts as present. Non-cell types return `false` here;
 * their satisfaction (session/run/ready/arbitrary) is handled by the callers.
 *
 * Note: `globals` is seeded from `config.globalsStatic` at construction, so it
 * reads present whenever a static global exists, before any `command('globals')`
 * fires. That is intentional and presence-based.
 */
export function isStatePresent(
  collector: Collector.Instance,
  type: On.Types,
): boolean {
  switch (type) {
    case Const.Commands.Consent:
      return Object.keys(collector.consent).length > 0;
    case Const.Commands.User:
      return Object.keys(collector.user).length > 0;
    case Const.Commands.Globals:
      return Object.keys(collector.globals).length > 0;
    case Const.Commands.Custom:
      return Object.keys(collector.custom).length > 0;
    default:
      return false;
  }
}

/**
 * Predicate: is a `require` entry satisfied by the collector's CURRENT recorded
 * state? This is the level-not-edge core of order-independent activation: a
 * step's gate is checked against the present state, not against whether the
 * required type fired before or after the step registered.
 *
 * Cell-backed types defer to `isStatePresent` (presence, not grant — the
 * destination send-gate `getGrantedConsent` remains a separate concern).
 * `session` is satisfied once set; `run`/`ready` map to `allowed`. Any other
 * (arbitrary) type is satisfied once it has been broadcast (recorded in
 * `seenEvents`), which also recovers a broadcast that fired before the
 * requiring step registered.
 */
export function isRequireSatisfied(
  collector: Collector.Instance,
  type: On.Types,
): boolean {
  switch (type) {
    case Const.Commands.Consent:
    case Const.Commands.User:
    case Const.Commands.Globals:
    case Const.Commands.Custom:
      return isStatePresent(collector, type);
    case Const.Commands.Session:
      return collector.session !== undefined;
    case Const.Commands.Run:
    case Const.Commands.Ready:
      return collector.allowed === true;
    default:
      return collector.seenEvents.has(String(type));
  }
}

/**
 * Read a subscriber's high-water mark. A subscriber that has never been
 * delivered has no entry; we read that as the sentinel -1 ("-infinity").
 * Since `stateVersion` starts at 0, the sentinel makes registration catch-up
 * fire (`stateVersion(0) > -1`) even when no version bump has occurred yet.
 *
 * Subscriber identity keys are objects: a `ConsentRule` object (marked per
 * rule-OBJECT, coarser than per-key but sufficient for single-grant
 * exactly-once), a generic-fn, or a source instance.
 */
function getMark(collector: Collector.Instance, subscriber: object): number {
  const mark = collector.delivery.get(subscriber);
  return mark === undefined ? -1 : mark;
}

/** Advance a subscriber's mark to the current stateVersion after an invocation. */
export function setMark(
  collector: Collector.Instance,
  subscriber: object,
): void {
  collector.delivery.set(subscriber, collector.stateVersion);
}

/**
 * A subscriber is invoked for a state delivery iff the state has advanced
 * past its mark AND the collector is allowed. While `!allowed`, deliveries
 * are deferred (not fired, mark not advanced) so the subscriber stays "owed".
 */
export function shouldDeliver(
  collector: Collector.Instance,
  subscriber: object,
): boolean {
  return (
    collector.allowed && collector.stateVersion > getMark(collector, subscriber)
  );
}

/**
 * Bounded recursion guard. A state-delivery callback may emit a new state
 * command, re-entering the cascade. A cyclic cascade (A reacts to user by
 * emitting consent, B reacts to consent by emitting user, with ever-changing
 * values that keep bumping `stateVersion`) would recurse until stack overflow.
 *
 * This is a terminate-and-log bound, NOT a fixpoint: when a single
 * `(subscriber, cell-type)` pair would be delivered more than
 * `MAX_DELIVERY_REVISIONS` times within ONE top-level command's cascade, the
 * pair stops delivering and a single non-convergence error is logged. State is
 * left at its last recorded value (no rollback); the outer command finishes and
 * flushes once. Legitimate wide fan-out does not trip: only the SAME
 * `(subscriber, cell-type)` revisited past the bound bails.
 */
const MAX_DELIVERY_REVISIONS = 8;

/**
 * Open the cascade-tracking structure for the OUTERMOST top-level state command
 * and return a teardown that clears it. Nested commands emitted by reacting
 * callbacks find `collector.cascade` already set and reuse it (teardown is a
 * no-op for them), so the counters are scoped to the originating command and
 * reset when it returns. Re-entrancy is detected by the presence of
 * `collector.cascade`.
 *
 * Assumes top-level state commands run serially on a given collector;
 * concurrent overlapping state commands on one shared collector are not
 * supported (web is serial; the server per-request path is event push, not
 * state commands).
 */
export function enterCascade(collector: Collector.Instance): () => void {
  if (collector.cascade) return () => undefined;
  collector.cascade = { counts: new WeakMap() };
  return () => {
    collector.cascade = undefined;
  };
}

/**
 * Check-and-increment the per-`(subscriber, cell-type)` delivery count for the
 * current cascade. Returns `true` when the delivery is allowed, `false` when the
 * pair has exceeded `MAX_DELIVERY_REVISIONS` (the caller must then skip the
 * delivery). On the single bailing transition, logs the non-convergence error
 * once per pair. Outside a cascade (no `collector.cascade`) it always allows.
 *
 * `subscriber` is the identity object (an `on()` rule, generic-fn, or source
 * instance); `type` is the cell type (consent/user/globals/custom).
 */
function cascadeAllow(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
): boolean {
  const cascade = collector.cascade;
  if (!cascade) return true;

  let byType = cascade.counts.get(subscriber);
  if (!byType) {
    byType = {};
    cascade.counts.set(subscriber, byType);
  }

  const key = String(type);
  const next = (byType[key] || 0) + 1;
  byType[key] = next;

  if (next <= MAX_DELIVERY_REVISIONS) return true;

  // Past the bound: skip the delivery. Log exactly once per `(subscriber,
  // cell-type)`: the count crosses `MAX + 1` exactly once, so logging on that
  // single transition avoids spam without a separate bail flag.
  if (next === MAX_DELIVERY_REVISIONS + 1)
    collector.logger.error('state delivery did not converge', { type: key });

  return false;
}

/**
 * Build the unified On.Context passed to every subscription callback.
 * Mirrors the Mapping.Context posture: collector + scoped logger only.
 */
function buildOnContext(
  collector: Collector.Instance,
  type: On.Types,
): On.Context {
  return {
    collector,
    logger: collector.logger.scope('on').scope(String(type)),
  };
}

/**
 * Registers a callback for a specific event type.
 *
 * @param collector The walkerOS collector instance.
 * @param type The type of the event to listen for.
 * @param option The callback function or an array of callback functions.
 */
export async function on(
  collector: Collector.Instance,
  type: On.Types,
  option: WalkerOS.SingleOrArray<On.Subscription>,
) {
  const on = collector.on;
  const onType: Array<On.Subscription> = on[type] || [];
  const options = isArray(option) ? option : [option];

  options.forEach((option) => {
    onType.push(option);
  });

  // Update collector on state
  (on[type] as typeof onType) = onType;

  // Execute the on function directly
  fireCallbacks(collector, type, options);
}

/**
 * Calls a destination's on() handler with proper context.
 * Used by both onApply() for immediate calls and destinationInit() for flushing queued events.
 */
export function callDestinationOn(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  type: On.Types,
  data: unknown,
) {
  if (!destination.on) return;

  const destType = destination.type || 'unknown';
  const destLogger = collector.logger.scope(destType).scope('on').scope(type);

  const context: Destination.Context = {
    collector,
    logger: destLogger,
    id: destId,
    config: destination.config,
    data: data as Destination.Data,
    env: mergeEnvironments(destination.env, destination.config.env),
  };

  tryCatch(destination.on, (err) =>
    logOnCallbackError(collector, 'destination', err, { destId, type }),
  )(type, context);
}

/**
 * Fire a set of registered `on` callbacks against current collector state.
 *
 * Used by both `on()` (when registering a new callback, to fire it against
 * current state) and `onApply()` (when dispatching a state-change command to
 * every registered callback of that type). Separating this from `onApply`
 * ensures `on()` does NOT trigger `onApply`'s source/destination broadcast,
 * which would cause infinite recursion if a source's `on` handler registers
 * another callback of the same type.
 */
function fireCallbacks(
  collector: Collector.Instance,
  type: On.Types,
  options: Array<On.Subscription>,
  config?: unknown,
): void {
  // Calculate context data once for all sources and destinations.
  const contextData = resolveDeliveryData(collector, type, config);

  if (!options.length) return;

  switch (type) {
    case Const.Commands.Consent:
      onConsent(
        collector,
        options as Array<On.ConsentRule>,
        config as WalkerOS.Consent,
      );
      break;
    case Const.Commands.Ready:
      onReady(collector, options as Array<On.ReadyFn>);
      break;
    case Const.Commands.Run:
      onRun(collector, options as Array<On.RunFn>);
      break;
    case Const.Commands.Session:
      onSession(collector, options as Array<On.SessionFn>);
      break;
    default: {
      // Generic handler for user, custom, globals, config, and arbitrary events
      const ctx = buildOnContext(collector, type);
      const gated = isStateDelivery(type);
      options.forEach((func) => {
        if (typeof func !== 'function') return;
        // State-delivery generics (user/custom/globals) carry the per-subscriber
        // exactly-once + `allowed` gate. Non-reactive generics (config, arbitrary
        // events) keep their previous unconditional behavior.
        if (gated && !shouldDeliver(collector, func)) return;
        // Bounded recursion guard: a reacting generic that re-emits state could
        // cascade cyclically. Stop delivering this (func, cell-type) past the
        // bound (logs once); leave state at its last value.
        if (gated && !cascadeAllow(collector, func, type)) return;
        tryCatch(func as On.GenericFn, (err) =>
          logOnCallbackError(collector, 'generic', err, { type }),
        )(contextData, ctx);
        if (gated) setMark(collector, func);
      });
      break;
    }
  }
}

/**
 * Resolve the broadcast payload for a state/lifecycle delivery. An explicit
 * `config` (the command's update payload) wins; otherwise the current cell on
 * the collector is read. Shared by `onApply` and the run-barrier re-delivery so
 * both broadcast identical data.
 */
function resolveDeliveryData(
  collector: Collector.Instance,
  type: On.Types,
  config?: unknown,
): unknown {
  switch (type) {
    case Const.Commands.Consent:
      return config || collector.consent;
    case Const.Commands.Session:
      return collector.session;
    case Const.Commands.User:
      return config || collector.user;
    case Const.Commands.Custom:
      return config || collector.custom;
    case Const.Commands.Globals:
      return config || collector.globals;
    case Const.Commands.Config:
      return config || collector.config;
    default:
      return undefined;
  }
}

/**
 * Deliver a single state/lifecycle event to one started source's `on` handler,
 * carrying the per-subscriber exactly-once + `allowed` gate for state
 * deliveries. Returns `true` when the handler vetoed (returned `false`).
 *
 * Shared by the live `onApply` broadcast and the run-barrier re-delivery. It
 * does NOT touch `config.require` or `queueOn`: those belong to the live
 * command path's unstarted-source handling, not the barrier.
 */
async function deliverStateToSource(
  collector: Collector.Instance,
  source: Source.Instance,
  sourceId: string,
  type: On.Types,
  contextData: unknown,
): Promise<boolean> {
  if (!source.on) return false;

  // State deliveries (consent/user/globals/custom) carry the per-subscriber
  // exactly-once + `allowed` gate keyed by the source instance. While !allowed
  // a state delivery is deferred (not invoked, mark not advanced). Lifecycle
  // deliveries (ready/run/session/config) are not gated here.
  if (isStateDelivery(type) && !shouldDeliver(collector, source)) return false;

  // Bounded recursion guard: a source `on` handler that re-emits state could
  // cascade cyclically. Stop delivering this (source, cell-type) past the bound
  // (logs once); leave state at its last value.
  if (isStateDelivery(type) && !cascadeAllow(collector, source, type))
    return false;

  const result = await tryCatchAsync(source.on, (err) =>
    logOnCallbackError(collector, 'source', err, { sourceId, type }),
  )(type, contextData);

  if (isStateDelivery(type)) setMark(collector, source);

  return result === false;
}

/**
 * Run-barrier re-delivery. Called once from `runCollector` after the collector
 * becomes `allowed` and the RunState merge has bumped `stateVersion` for any
 * merged cells. Re-broadcasts each non-empty recorded state cell to its OWED
 * subscribers (mark < stateVersion) exactly once, so reactions deferred while
 * `!allowed` now emit into the open, consent-gated pipeline.
 *
 * Narrow path: it fires `collector.on` rules/fns via `fireCallbacks` and the
 * gated `source.on` loop via `deliverStateToSource`. It deliberately skips the
 * `require`-decrement and `queueOn`-flush machinery in `onApply` (those are
 * live-command concerns). Exactly-once is free from the `shouldDeliver` gate:
 * already-delivered subscribers (mark == stateVersion) are skipped.
 */
export async function redeliverStateAtRun(
  collector: Collector.Instance,
): Promise<void> {
  const cells: Array<On.Types> = [
    Const.Commands.Consent,
    Const.Commands.User,
    Const.Commands.Globals,
    Const.Commands.Custom,
  ];

  for (const type of cells) {
    if (!isStatePresent(collector, type)) continue;

    const contextData = resolveDeliveryData(collector, type);

    // Re-deliver to registered collector.on rules/fns. fireCallbacks carries
    // the same per-subscriber gate, so owed rules fire once and advance.
    fireCallbacks(collector, type, collector.on[type] || []);

    // Re-deliver to started sources' on handlers via the gated helper.
    for (const [sourceId, source] of Object.entries(collector.sources)) {
      if (!isSourceStarted(source)) continue;
      await deliverStateToSource(
        collector,
        source,
        sourceId,
        type,
        contextData,
      );
    }
  }
}

/**
 * Applies all registered callbacks for a specific event type.
 *
 * @param collector The walkerOS collector instance.
 * @param type The type of the event to apply the callbacks for.
 * @param options The options for the callbacks.
 * @param config The consent configuration.
 */
export async function onApply(
  collector: Collector.Instance,
  type: On.Types,
  options?: Array<On.Subscription>,
  config?: unknown,
): Promise<boolean> {
  // Record every broadcast type so a `require:[<arbitrary>]` gate stays
  // satisfiable from current state (incl. a broadcast that fired before the
  // requiring step registered). Cell-backed types are level-checked separately.
  collector.seenEvents.add(String(type));

  // Use the optionally provided options
  let onConfig = options || [];

  if (!options) {
    // Get the collector on events
    onConfig = collector.on[type] || [];
  }

  // Calculate context data once for source/destination broadcast.
  const contextData = resolveDeliveryData(collector, type, config);

  let vetoed = false;
  // Per-source require decrement + gated on() delivery.
  // Sources are not "started" until config.init === true AND config.require is empty.
  // Unstarted sources have their on() events queued in instance.queueOn
  // and replayed once they start.
  for (const [sourceId, source] of Object.entries(collector.sources)) {
    if (source.config.require?.length) {
      const idx = source.config.require.indexOf(type);
      if (idx !== -1) source.config.require.splice(idx, 1);
    }

    if (!source.on) continue;

    if (isSourceStarted(source)) {
      const sourceVetoed = await deliverStateToSource(
        collector,
        source,
        sourceId,
        type,
        contextData,
      );
      if (sourceVetoed) vetoed = true;
    } else {
      source.queueOn = source.queueOn || [];
      source.queueOn.push({ type, data: contextData });
    }
  }

  Object.entries(collector.destinations).forEach(([destId, destination]) => {
    if (destination.on) {
      // Queue if destination not yet initialized
      if (!destination.config.init) {
        destination.queueOn = destination.queueOn || [];
        destination.queueOn.push({ type, data: contextData });
        return;
      }
      callDestinationOn(collector, destination, destId, type, contextData);
    }
  });

  // Sources whose require was just emptied AND init has run: flush their
  // queueOn now (the require-completing event was queued in the gated
  // branch above, so flushing here delivers it without losing ordering).
  for (const [sourceId, source] of Object.entries(collector.sources)) {
    if (isSourceStarted(source) && source.queueOn?.length) {
      await flushSourceQueueOn(collector, source, sourceId);
    }
  }

  // Activate any pending source/destination whose require is now satisfied by
  // current state. Level-based and additive: the per-source broadcast decrement
  // above still handles started-source delivery + queueOn buffering; reconcile
  // additionally activates steps satisfied by the recorded cell (or by an
  // arbitrary type already in `seenEvents`), so order does not matter.
  //
  // Gate the await on there being actual pending work: with nothing to
  // reconcile this is a no-op, and skipping the await preserves the
  // synchronous microtask ordering the bounded-recursion cascade relies on.
  const hasUnstartedSource = Object.values(collector.sources).some(
    (source) => !isSourceStarted(source) && source.config.require?.length,
  );
  if (
    Object.keys(collector.pending.destinations).length > 0 ||
    hasUnstartedSource
  ) {
    await reconcilePending(collector);
  }

  fireCallbacks(collector, type, onConfig, config);

  return !vetoed;
}

function onConsent(
  collector: Collector.Instance,
  onConfig: Array<On.ConsentRule>,
  currentConsent?: WalkerOS.Consent,
): void {
  const consentState = currentConsent || collector.consent;
  const ctx = buildOnContext(collector, Const.Commands.Consent);

  onConfig.forEach((rule) => {
    // Per-subscriber exactly-once gate, keyed by the rule OBJECT (coarser than
    // per-key, but sufficient for single-grant exactly-once). While !allowed
    // the delivery is deferred: don't invoke, don't advance the mark.
    if (!shouldDeliver(collector, rule)) return;

    // Bounded recursion guard: a consent rule that re-emits state could cascade
    // cyclically. Stop delivering this (rule, consent) past the bound (logs
    // once); leave state at its last value.
    if (!cascadeAllow(collector, rule, Const.Commands.Consent)) return;

    // Execute every handler whose consent key is present in the current state.
    Object.keys(consentState)
      .filter((key) => key in rule)
      .forEach((key) => {
        tryCatch(rule[key], (err) =>
          logOnCallbackError(collector, 'consent', err, { key }),
        )(consentState, ctx);
      });

    // Advance the mark after an allowed invocation.
    setMark(collector, rule);
  });
}

function onReady(
  collector: Collector.Instance,
  onConfig: Array<On.ReadyFn>,
): void {
  if (!collector.allowed) return;
  const ctx = buildOnContext(collector, Const.Commands.Ready);
  onConfig.forEach((func) => {
    tryCatch(func, (err) => logOnCallbackError(collector, 'ready', err))(
      undefined,
      ctx,
    );
  });
}

function onRun(collector: Collector.Instance, onConfig: Array<On.RunFn>): void {
  if (!collector.allowed) return;
  const ctx = buildOnContext(collector, Const.Commands.Run);
  onConfig.forEach((func) => {
    tryCatch(func, (err) => logOnCallbackError(collector, 'run', err))(
      undefined,
      ctx,
    );
  });
}

function onSession(
  collector: Collector.Instance,
  onConfig: Array<On.SessionFn>,
): void {
  if (!collector.session) return;
  const ctx = buildOnContext(collector, Const.Commands.Session);
  onConfig.forEach((func) => {
    tryCatch(func, (err) => logOnCallbackError(collector, 'session', err))(
      collector.session,
      ctx,
    );
  });
}
