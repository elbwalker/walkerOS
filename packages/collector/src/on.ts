import type {
  Collector,
  On,
  WalkerOS,
  Destination,
  Source,
  Logger,
} from '@walkeros/core';
import { isArray, FatalError } from '@walkeros/core';
import { Const } from './constants';
import { tryCatch, tryCatchAsync } from '@walkeros/core';
import { mergeEnvironments, pushToDestinations } from './destination';
import { buildReportError, errorMeta } from './report-error';
import { reconcilePending } from './pending';
import { flushSourceQueueOn, isSourceStarted } from './source';
import {
  DEFAULT_DESTINATION_TIMEOUT_MS,
  DestinationTimeoutError,
  resolveDestinationTimeout,
  withTimeout,
} from './timeout';

/**
 * Type guard: is `value` a genuine collector instance? A real collector ALWAYS
 * carries a `.logger` with a `.scope` function (see `collector.ts`, which
 * assigns `logger: createLogger(...)` unconditionally; `createLogger` never
 * returns undefined). So a value that fails this check can ONLY be a
 * foreign/non-collector caller; it can never be a real internal dispatch.
 * Cast-free: narrows via `typeof`/`in` only.
 */
function isCollectorInstance(value: unknown): value is Collector.Instance {
  if (typeof value !== 'object' || value === null) return false;
  if (!('logger' in value)) return false;
  const logger = value.logger;
  if (typeof logger !== 'object' || logger === null) return false;
  return 'scope' in logger && typeof logger.scope === 'function';
}

/**
 * One-time, logger-less warning for a foreign dispatch. There is no collector
 * (hence no scoped logger) to use, so fall back to `console.warn`, guarded for
 * environments without a console, and fire at most once total to avoid spamming
 * a host page that may be calling a leaked global repeatedly.
 */
let warnedForeignDispatch = false;
function warnForeignDispatch(): void {
  if (warnedForeignDispatch) return;
  warnedForeignDispatch = true;
  if (typeof console !== 'undefined' && typeof console.warn === 'function')
    console.warn(
      'walkerOS: ignored an on-dispatch call with a non-collector argument',
    );
}

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
    ...errorMeta(error),
  });
}

/**
 * The reactive state cells: the only commands that bump `collector.stateVersion`
 * and carry the per-subscriber exactly-once + `allowed` gate. Single source of
 * truth for "which types are state cells" — every list/membership check derives
 * from here, so adding a cell is a one-line change (no silently-missed site).
 */
const STATE_CELLS: readonly On.Types[] = [
  Const.Commands.Consent,
  Const.Commands.User,
  Const.Commands.Globals,
  Const.Commands.Custom,
];

/**
 * State-delivery event types: the reactive-state commands that bump
 * `collector.stateVersion` (see handle.ts). These are the only deliveries
 * subject to the per-subscriber high-water-mark + `allowed` gate. Lifecycle
 * types (ready/run/session) and non-reactive config keep their own gating
 * (onReady/onRun check `allowed`, onSession checks `session`).
 */
export function isStateDelivery(type: On.Types): boolean {
  return STATE_CELLS.includes(type);
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
 * `run`/`ready` map to `allowed`. Any other type (including `session`) is
 * satisfied once it has been broadcast (recorded in `seenEvents`), which also
 * recovers a broadcast that fired before the requiring step registered.
 *
 * `session` deliberately uses the `seenEvents` path, not a cell check:
 * `collector.session` is vestigial (never written), so gating on it would park
 * a `require:["session"]` step forever. The session source signals via
 * `command('session', …)`, which records `session` in `seenEvents`, so this
 * keeps `session` order-independent like every other type.
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
    case Const.Commands.Run:
    case Const.Commands.Ready:
      return collector.allowed === true;
    default:
      return collector.seenEvents.has(String(type));
  }
}

/**
 * Read a subscriber's high-water mark FOR A CELL. A subscriber that has never
 * been delivered that cell has no entry; we read that as the sentinel -1
 * ("-infinity"). Since `stateVersion` starts at 0, the sentinel makes
 * registration catch-up fire (`stateVersion(0) > -1`) even when no version bump
 * has occurred yet.
 *
 * Marks are per `(subscriber, cell-type)`: a subscriber owed two distinct cells
 * at the same `stateVersion` must receive both, so each cell carries its own
 * mark. Subscriber identity keys are objects: a `ConsentRule` object (marked per
 * rule-OBJECT, coarser than per-key but sufficient for single-grant
 * exactly-once), a generic-fn, or a source instance.
 */
function getMark(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
): number {
  const marks = collector.delivery.get(subscriber);
  const mark = marks?.[String(type)];
  return mark === undefined ? -1 : mark;
}

/**
 * The version at which a CELL last changed. A single global `stateVersion`
 * cannot gate per-cell delivery: a later bump to cell B would make an
 * already-delivered cell A look stale. `cellVersion[type]` advances only when
 * that cell changes, so each cell's freshness is independent. A cell never
 * mutated via a command (e.g. `globalsStatic` seeded at construction) reads 0,
 * the construction baseline, so it still delivers once at the run barrier.
 */
function cellVersionOf(collector: Collector.Instance, type: On.Types): number {
  // Read before every destination state delivery, including from callers
  // that hand in a partial collector without version state.
  return collector.cellVersion?.[String(type)] ?? 0;
}

/**
 * Advance a subscriber's mark for a cell to that cell's current version after
 * an invocation. Only the delivered cell's mark moves; other cells stay owed.
 */
export function setMark(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
): void {
  let marks = collector.delivery.get(subscriber);
  if (!marks) {
    marks = {};
    collector.delivery.set(subscriber, marks);
  }
  marks[String(type)] = cellVersionOf(collector, type);
}

/**
 * A subscriber is invoked for a state delivery iff that CELL has advanced past
 * its per-cell mark AND the collector is allowed. While `!allowed`, deliveries
 * are deferred (not fired, mark not advanced) so the subscriber stays "owed".
 */
export function shouldDeliver(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
): boolean {
  return (
    collector.allowed &&
    cellVersionOf(collector, type) > getMark(collector, subscriber, type)
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
 * (or an init flush) and return a teardown. Nested commands emitted by
 * reacting callbacks find `collector.cascade` already set and join it, so the
 * counters are scoped to the originating command; the cascade is cleared when
 * its last holder leaves. Re-entrancy is detected by the presence of
 * `collector.cascade`.
 *
 * Assumes top-level state commands run serially on a given collector;
 * concurrent overlapping state commands on one shared collector are not
 * supported (web is serial; the server per-request path is event push, not
 * state commands).
 */
export function enterCascade(collector: Collector.Instance): () => void {
  const open = collector.cascade;
  // A cascade this function did not open is left to whoever set it.
  if (open && !cascadeHolders.has(open)) return () => undefined;

  const cascade = open || { counts: new WeakMap() };
  collector.cascade = cascade;
  cascadeHolders.set(cascade, (cascadeHolders.get(cascade) || 0) + 1);

  // Reference-counted: the cascade stays open until its last holder leaves,
  // so a command that opened it and finishes first does not end it under an
  // init flush or a nested command still running in it.
  let left = false;
  return () => {
    if (left) return;
    left = true;
    const holders = (cascadeHolders.get(cascade) || 1) - 1;
    if (holders > 0) {
      cascadeHolders.set(cascade, holders);
      return;
    }
    cascadeHolders.delete(cascade);
    if (collector.cascade === cascade) collector.cascade = undefined;
  };
}

/** Open holders per cascade opened by `enterCascade`. */
const cascadeHolders = new WeakMap<Collector.Cascade, number>();

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
  // Fail closed against a FOREIGN/non-collector caller (see fireCallbacks and
  // isCollectorInstance). `on` dereferences `collector.on` immediately, so it
  // would throw before reaching the dispatch; guard at the top, no state
  // mutated. A real collector always has `.logger`, so this only ever catches a
  // foreign caller.
  if (!isCollectorInstance(collector)) {
    warnForeignDispatch();
    return;
  }

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
 * Calls a destination's on() handler with proper context and waits for it to
 * settle. Used by onApply() for live deliveries and by destinationInit() for
 * flushing queued deliveries; both await it, so a handler's side effect (a
 * vendor consent update, an SDK opt-out) lands before the destination's next
 * push. The wait is bounded by the destination's `config.timeout`, the same
 * window as a push.
 *
 * Returns whether the handler settled. A state delivery holds the destination
 * while it runs, and keeps holding it when it does not settle:
 * `pushToDestinations` then keeps its events in `queuePush` rather than
 * sending them to a vendor whose consent state was not set. The hold clears
 * once no state delivery to the destination is in flight and every present
 * state cell has reached the handler.
 *
 * One state handler call runs per destination at a time, so the state the
 * vendor applies last is always the newest. A state delivery that arrives
 * while a call runs does not call the handler: its cell stays owed, and the
 * current cells are delivered right after the running call ends. A call that
 * timed out stays in flight until its handler settles; its late settle marks
 * nothing, and the current cells, then the held events, follow from there.
 * Deferring rather than waiting keeps a handler that issues a state command
 * itself from waiting on its own call.
 *
 * A state delivery carries the command's delta when the destination has
 * received every earlier change of that cell, and the whole cell otherwise
 * (after a failed delivery, or when its mark trails by more than one change),
 * so a settled delivery never marks content it did not carry.
 */
export async function callDestinationOn(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  type: On.Types,
  data: unknown,
): Promise<boolean> {
  const handler = destination.on;
  if (!handler) return true;

  // Only a state cell (consent, user, globals, custom) has a push that depends
  // on it; a lifecycle delivery neither holds nor marks. The version is the
  // one this delivery carries, captured before anything can change the cell.
  const gated = isStateDelivery(type);

  // A handler call to this destination is still running: a second call
  // could settle first and be overwritten by the older state. The cell stays
  // owed instead. A call that settles in time delivers the current state
  // right after it; one that timed out does so when it finally settles.
  if (
    gated &&
    (overdueDeliveries.get(destination) || stateCalls.has(destination))
  ) {
    markStateLost(collector, destination, type);
    if (!overdueDeliveries.get(destination))
      deferredDuringCall.add(destination);
    return false;
  }

  const version = gated ? cellVersionOf(collector, type) : 0;
  const payload =
    gated && owesMoreThanDelta(collector, destination, type, version)
      ? resolveDeliveryData(collector, type)
      : data;

  const destType = destination.type || 'unknown';
  const destLogger = collector.logger.scope(destType).scope('on').scope(type);

  const context: Destination.Context = {
    collector,
    logger: destLogger,
    id: destId,
    config: destination.config,
    data: payload as Destination.Data,
    env: mergeEnvironments(destination.env, destination.config.env),
    reportError: buildReportError(
      collector,
      'destination',
      destId,
      destLogger,
      destination,
    ),
  };

  // The hold goes up before the handler runs, so an event pushed by another
  // caller while the handler is still running is parked rather than
  // overtaking it: pushes are not serialized with state commands.
  if (gated) {
    openStateDelivery(destination, type);
    setInFlightVersion(destination, type, version);
    stateCalls.add(destination);
  }

  const timeoutMs = resolveDestinationTimeout(destination.config.timeout);
  // The handler's own promise, kept for a delivery that times out.
  let running: Promise<unknown> = Promise.resolve();
  let settled = true;
  let timedOut = false;
  let threw = true;
  try {
    await tryCatchAsync(
      () => {
        running = Promise.resolve(handler(type, context));
        return withTimeout(
          running,
          timeoutMs,
          `Destination "${destId}" on(${type}) did not settle within ${timeoutMs}ms`,
        );
      },
      (err) => {
        settled = false;
        if (err instanceof DestinationTimeoutError) timedOut = true;
        logOnCallbackError(collector, 'destination', err, { destId, type });
      },
    )();
    threw = false;
  } finally {
    // Also runs when a FatalError propagates: the delivery counts as failed
    // and the window closes, so a later settled delivery can release the hold.
    // No follow-up runs then, so nothing stays deferred.
    if (gated) {
      stateCalls.delete(destination);
      if (threw) deferredDuringCall.delete(destination);
      const lost = lostCells.get(destination);
      if (settled) {
        advanceMark(collector, destination, type, version);
        lost?.delete(String(type));
      } else {
        markStateLost(collector, destination, type);
      }
      if (timedOut) {
        awaitOverdueDelivery(
          collector,
          destination,
          destId,
          type,
          version,
          running,
          destLogger,
        );
      } else {
        clearInFlightVersion(destination, type, version);
        closeStateDelivery(collector, destination);
      }
    }
  }

  // State that arrived while the handler ran follows now, as current cells.
  if (gated && !timedOut && deferredDuringCall.delete(destination))
    await catchUpDestinationState(collector, destination, destId);

  return settled;
}

/**
 * Timed-out state deliveries to a destination whose handler has not settled
 * yet. While one runs, no other state delivery to the destination starts.
 */
const overdueDeliveries = new WeakMap<Destination.Instance, number>();

/**
 * Destinations whose state handler call is running. Only one runs at a time:
 * a state delivery that arrives meanwhile is deferred.
 */
const stateCalls = new WeakSet<Destination.Instance>();

/**
 * Destinations with a state delivery deferred behind a running call. When
 * that call ends in time, the destination catches up on the current state.
 */
const deferredDuringCall = new WeakSet<Destination.Instance>();

/**
 * Keep a timed-out state delivery in flight until its handler settles, then
 * close its window. The cell was recorded as lost at the timeout and stays
 * owed, whatever the late outcome, so the hold is released only by a later
 * delivery that carries the current cell and settles in time. That delivery
 * starts from the settle itself, followed by the held events. A handler that
 * never settles keeps the destination held.
 */
function awaitOverdueDelivery(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  type: On.Types,
  version: number,
  running: Promise<unknown>,
  logger: Logger.Instance,
): void {
  overdueDeliveries.set(
    destination,
    (overdueDeliveries.get(destination) || 0) + 1,
  );
  const settle = () => {
    const count = (overdueDeliveries.get(destination) || 0) - 1;
    if (count > 0) overdueDeliveries.set(destination, count);
    else overdueDeliveries.delete(destination);
    const lost = lostCells.get(destination);
    if (lost) lost.add(String(type));
    else lostCells.set(destination, new Set([String(type)]));
    clearInFlightVersion(destination, type, version);
    closeStateDelivery(collector, destination);
    logger.debug('late settle after timeout');
    deferredDuringCall.delete(destination);
    if (collector.allowed && collector.destinations[destId] === destination)
      recoverDestinationState(collector, destination, destId, logger);
  };
  running.then(settle, settle);
}

/**
 * Deliver the state a destination still owes, then push the events held for
 * it, without waiting for its next push.
 */
function recoverDestinationState(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  logger: Logger.Instance,
): void {
  tryCatchAsync(
    async () => {
      await catchUpDestinationState(collector, destination, destId);
      if (!getStateHold(destination) && destination.queuePush?.length)
        await pushToDestinations(
          collector,
          undefined,
          {},
          {
            [destId]: destination,
          },
        );
    },
    (err) => {
      logger.error('state recovery failed', errorMeta(err));
    },
  )();
}

/**
 * A destination's state hold: set while a state delivery (consent, user,
 * globals, custom) to its `on` handler is running, and kept when it does not
 * settle. While it is set the collector delivers no events to it: they stay in
 * its `queuePush`. Cleared once every present state cell has reached the
 * handler. Collector-internal bookkeeping, keyed by the destination instance.
 */
export interface StateHold {
  type: On.Types;
  since: number;
}

const stateHolds = new WeakMap<Destination.Instance, StateHold>();

/** The destination's current state hold, if it is held. */
export function getStateHold(
  destination: Destination.Instance,
): StateHold | undefined {
  return stateHolds.get(destination);
}

/**
 * State deliveries to a destination that have started and not yet ended. The
 * hold is never released while one is running.
 */
const stateInFlight = new WeakMap<Destination.Instance, number>();

/**
 * Per destination and cell, the newest version a running delivery carries. A
 * second delivery of a version that is already on its way is not started.
 */
const inFlightVersions = new WeakMap<
  Destination.Instance,
  Record<string, number>
>();

function setInFlightVersion(
  destination: Destination.Instance,
  type: On.Types,
  version: number,
): void {
  let versions = inFlightVersions.get(destination);
  if (!versions) {
    versions = {};
    inFlightVersions.set(destination, versions);
  }
  const key = String(type);
  const current = versions[key];
  if (current === undefined || current < version) versions[key] = version;
}

function clearInFlightVersion(
  destination: Destination.Instance,
  type: On.Types,
  version: number,
): void {
  const versions = inFlightVersions.get(destination);
  if (versions && versions[String(type)] === version)
    delete versions[String(type)];
}

/**
 * Cells whose last delivery to a destination did not settle. The next
 * delivery of such a cell carries the whole cell, and the hold stays until it
 * settles.
 */
const lostCells = new WeakMap<Destination.Instance, Set<string>>();

/**
 * Destinations whose init flush is running. `held` records whether the flush
 * opened a state delivery window, closed once when the flush ends.
 */
const initFlushes = new WeakMap<Destination.Instance, { held: boolean }>();

/**
 * Start a destination's init flush. While it runs, new deliveries to the
 * destination are queued behind the flush's entries. When the queue carries a
 * state entry the hold covers the whole flush, lifecycle entries before it
 * included, so no push slips in between two entries.
 */
export function beginInitFlush(destination: Destination.Instance): void {
  const first = destination.queueOn?.find(({ type }) => isStateDelivery(type));
  if (first) openStateDelivery(destination, first.type);
  initFlushes.set(destination, { held: !!first });
}

/** End a destination's init flush, releasing its window if it opened one. */
export function endInitFlush(
  collector: Collector.Instance,
  destination: Destination.Instance,
): void {
  const flush = initFlushes.get(destination);
  initFlushes.delete(destination);
  if (flush?.held) closeStateDelivery(collector, destination);
}

/**
 * Record that a state cell did not reach a destination's handler: the mark is
 * taken back, the next delivery of the cell carries all of it, and the
 * destination is held, dated now, until that delivery settles. Used for a
 * delivery that failed, one the init flush never reached, and one the cascade
 * bound suppressed.
 */
export function markStateLost(
  collector: Collector.Instance,
  destination: Destination.Instance,
  type: On.Types,
): void {
  clearMark(collector, destination, type);
  const lost = lostCells.get(destination);
  if (lost) lost.add(String(type));
  else lostCells.set(destination, new Set([String(type)]));
  stateHolds.set(destination, { type, since: Date.now() });
}

/**
 * Whether a destination is owed state: a cell whose delivery was lost, or a
 * present cell it has not received at its current version. False while the
 * collector is not allowed (nothing is deliverable yet).
 */
export function owesDestinationState(
  collector: Collector.Instance,
  destination: Destination.Instance,
): boolean {
  if (lostCells.get(destination)?.size) return true;
  return STATE_CELLS.some(
    (cell) =>
      isStatePresent(collector, cell) &&
      shouldDeliver(collector, destination, cell),
  );
}

/**
 * Start a state delivery window on a destination: raise the hold and count
 * the window as in flight. Every call is paired with `closeStateDelivery`.
 * Used per delivery by `callDestinationOn`, and around the whole init flush by
 * `destinationInit`, so no push slips in between two queued entries.
 */
export function openStateDelivery(
  destination: Destination.Instance,
  type: On.Types,
): void {
  stateInFlight.set(destination, (stateInFlight.get(destination) || 0) + 1);
  stateHolds.set(destination, { type, since: Date.now() });
}

/**
 * End a state delivery window, then release the hold if nothing else is in
 * flight and nothing is owed.
 */
export function closeStateDelivery(
  collector: Collector.Instance,
  destination: Destination.Instance,
): void {
  const count = (stateInFlight.get(destination) || 0) - 1;
  if (count > 0) stateInFlight.set(destination, count);
  else stateInFlight.delete(destination);
  releaseHoldIfCurrent(collector, destination);
}

/**
 * Whether a delivery of `type` at `version` would leave a gap if it carried
 * only the command's delta: the cell's last delivery failed, the destination
 * has no mark for the cell (it never received it, so earlier content may be
 * missing), or its mark trails by more than one change. Every activation path
 * marks the present cells first, so in the init flush (entries marked when
 * queued) and on the live path the delta is what gets delivered.
 */
function owesMoreThanDelta(
  collector: Collector.Instance,
  destination: Destination.Instance,
  type: On.Types,
  version: number,
): boolean {
  if (lostCells.get(destination)?.has(String(type))) return true;
  const mark = collector.delivery?.get(destination)?.[String(type)];
  return mark === undefined || mark < version - 1;
}

/**
 * Advance a subscriber's mark for a cell to the version a delivery carried.
 * Marks only move forward: a slower delivery of an older version that settles
 * after a newer one does not take the mark back.
 */
function advanceMark(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
  version: number,
): void {
  let marks = collector.delivery.get(subscriber);
  if (!marks) {
    marks = {};
    collector.delivery.set(subscriber, marks);
  }
  const key = String(type);
  const current = marks[key];
  if (current === undefined || current < version) marks[key] = version;
}

/**
 * Take a delivery mark back, so the cell reads as owed again. The mirror of
 * `setMark`: a delivery that was committed (called, or queued for the init
 * flush) but did not settle has not happened, and the subscriber must be
 * offered it again.
 */
export function clearMark(
  collector: Collector.Instance,
  subscriber: object,
  type: On.Types,
): void {
  // Reached on every failed state delivery, including from callers that
  // hand in a partial collector without delivery marks.
  const marks = collector.delivery?.get(subscriber);
  if (marks) delete marks[String(type)];
}

/**
 * Clear a destination's hold only when no state delivery to it is in flight,
 * no delivery of a cell is outstanding after a failure, and every present
 * state cell has reached its `on` handler. A settled delivery of one cell
 * says nothing about another: a `user` delivery must not open the gate while
 * `consent` is still owed.
 */
function releaseHoldIfCurrent(
  collector: Collector.Instance,
  destination: Destination.Instance,
): void {
  if (!stateHolds.has(destination)) return;
  if (stateInFlight.get(destination)) return;
  if (lostCells.get(destination)?.size) return;
  const owed = STATE_CELLS.some(
    (cell) =>
      isStatePresent(collector, cell) &&
      shouldDeliver(collector, destination, cell),
  );
  if (!owed) stateHolds.delete(destination);
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
export function fireCallbacks(
  collector: Collector.Instance,
  type: On.Types,
  options: Array<On.Subscription>,
  config?: unknown,
): void {
  // Fail closed against a FOREIGN/non-collector caller. Threat: a minified
  // build can leak this helper onto a global that collides with another
  // library's API (e.g. a global named `ga`), which then invokes it with
  // foreign args like `("sent","event")`. The string "sent" would arrive here
  // as `collector` and crash on `"sent".logger.scope`. A genuine collector
  // ALWAYS has `.logger` (collector.ts assigns `logger: createLogger(...)`
  // unconditionally and createLogger never returns undefined), so this guard
  // can ONLY catch a foreign caller; it can never mask a real internal dispatch.
  if (!isCollectorInstance(collector)) {
    warnForeignDispatch();
    return;
  }

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
        if (gated && !shouldDeliver(collector, func, type)) return;
        // Bounded recursion guard: a reacting generic that re-emits state could
        // cascade cyclically. Stop delivering this (func, cell-type) past the
        // bound (logs once); leave state at its last value.
        if (gated && !cascadeAllow(collector, func, type)) return;
        tryCatch(func as On.GenericFn, (err) =>
          logOnCallbackError(collector, 'generic', err, { type }),
        )(contextData, ctx);
        if (gated) setMark(collector, func, type);
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
  if (isStateDelivery(type) && !shouldDeliver(collector, source, type))
    return false;

  // Bounded recursion guard: a source `on` handler that re-emits state could
  // cascade cyclically. Stop delivering this (source, cell-type) past the bound
  // (logs once); leave state at its last value.
  if (isStateDelivery(type) && !cascadeAllow(collector, source, type))
    return false;

  // One state handler call runs per source at a time, as for destinations: a
  // state delivery that arrives meanwhile leaves its cell owed, and the
  // current cells follow once the running call ends.
  const gated = isStateDelivery(type);
  if (gated && sourceStateCalls.has(source)) {
    deferredSourceCalls.add(source);
    return false;
  }
  const version = gated ? cellVersionOf(collector, type) : 0;
  if (gated) sourceStateCalls.add(source);

  // Sources carry no per-step timeout config and share the destination
  // default, so one hung source handler cannot stall the delivery pass.
  const handler = source.on;
  let running: Promise<unknown> = Promise.resolve();
  let timedOut = false;
  let result: unknown;
  try {
    result = await tryCatchAsync(
      () => {
        running = Promise.resolve(handler(type, contextData));
        return withTimeout(
          running,
          DEFAULT_DESTINATION_TIMEOUT_MS,
          `Source "${sourceId}" on(${type}) did not settle within ${DEFAULT_DESTINATION_TIMEOUT_MS}ms`,
        );
      },
      (err) => {
        if (err instanceof DestinationTimeoutError) timedOut = true;
        logOnCallbackError(collector, 'source', err, { sourceId, type });
      },
    )();
  } finally {
    // A timed-out call stays running until its handler settles.
    if (gated && !timedOut) sourceStateCalls.delete(source);
  }

  if (gated) {
    if (timedOut) {
      // A timed-out delivery has not happened: the mark stays, the cell stays
      // owed, and the current cells follow the late settle.
      const settle = () => {
        sourceStateCalls.delete(source);
        deferredSourceCalls.delete(source);
        if (collector.allowed && collector.sources[sourceId] === source)
          tryCatchAsync(
            () => catchUpSourceState(collector, source, sourceId),
            (err) => {
              collector.logger
                .scope('on')
                .error('state recovery failed', errorMeta(err));
            },
          )();
      };
      running.then(settle, settle);
    } else {
      advanceMark(collector, source, type, version);
      if (deferredSourceCalls.delete(source))
        await catchUpSourceState(collector, source, sourceId);
    }
  }

  return result === false;
}

/** Sources whose state handler call is running. */
const sourceStateCalls = new WeakSet<Source.Instance>();

/** Sources with a state delivery deferred behind a running call. */
const deferredSourceCalls = new WeakSet<Source.Instance>();

/** Deliver every present state cell a started source still owes. */
async function catchUpSourceState(
  collector: Collector.Instance,
  source: Source.Instance,
  sourceId: string,
): Promise<void> {
  // Opened or joined here, as for destinations, so the bound applies.
  const exitCascade = enterCascade(collector);
  try {
    for (const type of STATE_CELLS) {
      if (!isStatePresent(collector, type)) continue;
      await deliverStateToSource(
        collector,
        source,
        sourceId,
        type,
        resolveDeliveryData(collector, type),
      );
    }
  } finally {
    exitCascade();
  }
}

/**
 * Deliver one state or lifecycle event to a registered destination's `on`
 * handler. State deliveries (consent/user/globals/custom) carry the same
 * per-subscriber exactly-once + `allowed` gate as sources and `on` rules,
 * keyed by the destination instance: while `!allowed` the delivery is deferred
 * (not queued, mark not advanced) and the run barrier delivers it; once
 * allowed, each cell change reaches the destination exactly once. Lifecycle
 * deliveries (ready/run/session/config/arbitrary) are unconditional.
 *
 * A delivery is committed either by calling `on()` now (initialized
 * destination, marked by `callDestinationOn` when it settles) or by appending
 * to `queueOn`, which `destinationInit` flushes before the destination's first
 * push. The queue branch marks the cell itself: a cell already waiting in
 * `queueOn` is not owed, so the run barrier, which fires on every navigation,
 * does not append it again. A queued entry whose flush fails takes its mark
 * back in `callDestinationOn`, and the next delivery carries the whole cell.
 */
export async function deliverStateToDestination(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  type: On.Types,
  data: unknown,
): Promise<void> {
  if (!destination.on) return;

  const gated = isStateDelivery(type);
  if (gated && !shouldDeliver(collector, destination, type)) return;
  // The current version of the cell is already on its way to the handler.
  const inFlight = inFlightVersions.get(destination)?.[String(type)];
  if (
    gated &&
    inFlight !== undefined &&
    inFlight >= cellVersionOf(collector, type)
  )
    return;
  // Bounded recursion guard: a destination `on` handler that re-emits state
  // could cascade cyclically. Past the bound the delivery is skipped (logged
  // once). An initialized destination records the cell as lost, so it is held
  // until a later delivery of it settles. An uninitialized one runs no handler
  // here, so nothing can recurse: the whole cell is queued for its init flush
  // instead of this delta, replacing a trailing entry of the same cell.
  if (gated && !cascadeAllow(collector, destination, type)) {
    if (destination.config.init) {
      markStateLost(collector, destination, type);
      return;
    }
    const queue = (destination.queueOn = destination.queueOn || []);
    const entry = { type, data: resolveDeliveryData(collector, type) };
    const last = queue[queue.length - 1];
    if (last && last.type === type) queue[queue.length - 1] = entry;
    else queue.push(entry);
    setMark(collector, destination, type);
    lostCells.get(destination)?.delete(String(type));
    return;
  }

  // Uninitialized, or its init flush is still running: the delivery joins
  // the queue behind the older entries, so it never overtakes them.
  const flush = initFlushes.get(destination);
  if (!destination.config.init || flush) {
    destination.queueOn = destination.queueOn || [];
    destination.queueOn.push({ type, data });
    if (gated) {
      setMark(collector, destination, type);
      // A state entry joining a running flush holds the destination for the
      // rest of the flush.
      if (flush && !flush.held) {
        openStateDelivery(destination, type);
        flush.held = true;
      }
    }
    return;
  }

  await callDestinationOn(collector, destination, destId, type, data);
}

/**
 * Registration catch-up for a destination that just became active: a pending
 * `require` gate satisfied, or a runtime `walker destination`. Delivers every
 * present state cell as a snapshot through the same gate as a live broadcast,
 * so the destination's `on` handler sees the state that activated it before
 * its queued events are pushed, and holds a mark for every present cell
 * before any later delta reaches it. While `!allowed` this is inert and the
 * run barrier delivers instead. Also the retry of a held destination: only the
 * cells it still owes pass the gate.
 */
export async function catchUpDestinationState(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
): Promise<void> {
  if (!destination.on) return;
  // Opened or joined here, so a catch-up outside a command (a push's retry, a
  // late settle) still counts a handler that re-emits state against the bound.
  const exitCascade = enterCascade(collector);
  try {
    for (const type of STATE_CELLS) {
      if (!isStatePresent(collector, type)) continue;
      await deliverStateToDestination(
        collector,
        destination,
        destId,
        type,
        resolveDeliveryData(collector, type),
      );
    }
  } finally {
    exitCascade();
  }
}

/**
 * Whether a state delivery to the destination is running right now (a live
 * delivery or an init flush). A held destination is not retried while one is.
 */
export function isStateDeliveryInFlight(
  destination: Destination.Instance,
): boolean {
  return (stateInFlight.get(destination) || 0) > 0;
}

/**
 * Run-barrier re-delivery. Called once from `runCollector` after the collector
 * becomes `allowed` and the RunState merge has bumped `stateVersion` for any
 * merged cells. Re-broadcasts each non-empty recorded state cell to its OWED
 * subscribers (mark < stateVersion) exactly once, so reactions deferred while
 * `!allowed` now emit into the open, consent-gated pipeline.
 *
 * Narrow path: it fires `collector.on` rules/fns via `fireCallbacks`, the
 * gated `source.on` handlers via `deliverStateToSource`, and the gated
 * destination `on` handlers via `deliverStateToDestination` (queued for an
 * uninitialized destination's init flush). It deliberately skips the
 * `require`-decrement and `queueOn`-flush machinery in `onApply` (those are
 * live-command concerns). Exactly-once is free from the `shouldDeliver` gate:
 * already-delivered subscribers (mark == stateVersion) are skipped.
 */
export async function redeliverStateAtRun(
  collector: Collector.Instance,
): Promise<void> {
  const deliveries = await startRunRedelivery(collector);
  await Promise.all(deliveries.map(({ done }) => done));
}

/**
 * The run barrier without waiting for destinations. Rules and started sources
 * are re-delivered per cell and awaited (sources bounded); each destination
 * gets its own sequence of owed cells, started here and returned, so one slow
 * destination handler delays no other destination's run flush. A destination
 * is held from the start of its first delivery until nothing is owed.
 */
export async function startRunRedelivery(
  collector: Collector.Instance,
): Promise<DestinationDelivery[]> {
  // Fail closed against a FOREIGN/non-collector caller (see fireCallbacks and
  // isCollectorInstance). This dereferences the collector's state cells, so
  // guard at the top, no state mutated, neutral result. A real collector
  // always has `.logger`, so this only ever catches a foreign caller.
  if (!isCollectorInstance(collector)) {
    warnForeignDispatch();
    return [];
  }

  // Each registered destination receives every owed cell, in cell order, as
  // a snapshot of the cell when its turn comes.
  const deliveries: DestinationDelivery[] = [];
  for (const [destId, destination] of Object.entries(collector.destinations)) {
    if (!destination.on) continue;
    const sequence = async () => {
      for (const type of STATE_CELLS) {
        if (!isStatePresent(collector, type)) continue;
        await deliverStateToDestination(
          collector,
          destination,
          destId,
          type,
          resolveDeliveryData(collector, type),
        );
      }
    };
    deliveries.push(startDelivery(destId, destination, sequence()));
  }

  for (const type of STATE_CELLS) {
    if (!isStatePresent(collector, type)) continue;

    const contextData = resolveDeliveryData(collector, type);

    // Re-deliver to registered collector.on rules/fns. fireCallbacks carries
    // the same per-subscriber gate, so owed rules fire once and advance.
    fireCallbacks(collector, type, collector.on[type] || []);

    // Re-deliver to started sources through the gated helper, concurrently:
    // one slow source handler does not cost the others their own timeout.
    await Promise.all(
      Object.entries(collector.sources)
        .filter(([, source]) => isSourceStarted(source))
        .map(([sourceId, source]) =>
          deliverStateToSource(collector, source, sourceId, type, contextData),
        ),
    );
  }

  return deliveries;
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
  const { ok, deliveries } = await onApplyDeferred(
    collector,
    type,
    options,
    config,
  );
  await Promise.all(deliveries.map(({ done }) => done));
  return ok;
}

/**
 * A destination's `on()` delivery that a command started and did not wait
 * for. `drain` is set by the caller just before its flush when the
 * destination was held then: its events were parked, and once `done` settles
 * they are pushed for that destination alone.
 */
export interface DestinationDelivery {
  id: string;
  destination: Destination.Instance;
  done: Promise<void>;
  drain?: boolean;
}

/**
 * Start a destination delivery without waiting for it. A rejection (a
 * FatalError) stays on `done` for the caller that settles it; the handler
 * attached here only keeps it from surfacing as unhandled in between.
 */
function startDelivery(
  id: string,
  destination: Destination.Instance,
  done: Promise<void>,
): DestinationDelivery {
  done.catch(() => undefined);
  return { id, destination, done };
}

/**
 * `onApply` without waiting for destination deliveries. Sources are awaited
 * (bounded); every destination's `on()` delivery is started and returned, so
 * the caller can flush every destination at once: a destination whose
 * delivery is still running is held, its events wait for its own delivery,
 * and no other destination waits for it.
 */
export async function onApplyDeferred(
  collector: Collector.Instance,
  type: On.Types,
  options?: Array<On.Subscription>,
  config?: unknown,
): Promise<{ ok: boolean; deliveries: DestinationDelivery[] }> {
  // Fail closed against a FOREIGN/non-collector caller (see fireCallbacks and
  // isCollectorInstance). `onApply` dereferences `collector.seenEvents`
  // immediately, so it would throw before reaching the dispatch; guard at the
  // top, no state mutated. Return the neutral not-vetoed result (`true`). A real
  // collector always has `.logger`, so this only ever catches a foreign caller.
  if (!isCollectorInstance(collector)) {
    warnForeignDispatch();
    return { ok: true, deliveries: [] };
  }

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

  // Synchronous bookkeeping first, in subscriber order: the per-source require
  // decrement, queueOn buffering for unstarted sources and uninitialized
  // destinations, and the list of handlers that receive this delivery now.
  // Sources are not "started" until config.init === true AND config.require
  // is empty; their queued on() events are replayed once they start.
  const sourceDeliveries: Array<Promise<boolean>> = [];
  for (const [sourceId, source] of Object.entries(collector.sources)) {
    if (source.config.require?.length) {
      const idx = source.config.require.indexOf(type);
      if (idx !== -1) source.config.require.splice(idx, 1);
    }

    if (!source.on) continue;

    if (isSourceStarted(source)) {
      sourceDeliveries.push(
        deliverStateToSource(collector, source, sourceId, type, contextData),
      );
    } else {
      source.queueOn = source.queueOn || [];
      source.queueOn.push({ type, data: contextData });
    }
  }

  // Destinations: state deliveries are gated (exactly-once, deferred while
  // not allowed); an uninitialized destination's delivery is queued for its
  // init flush, synchronously, inside deliverStateToDestination.
  const deliveries: DestinationDelivery[] = [];
  for (const [destId, destination] of Object.entries(collector.destinations)) {
    if (!destination.on) continue;
    deliveries.push(
      startDelivery(
        destId,
        destination,
        deliverStateToDestination(
          collector,
          destination,
          destId,
          type,
          contextData,
        ),
      ),
    );
  }

  // Source handlers run concurrently, each bounded by the default timeout.
  // Destination deliveries are not awaited here: each is held while it runs
  // and the caller settles them after its flush. With no source handler to
  // wait for there is no await, which keeps the synchronous ordering the
  // bounded-recursion cascade relies on.
  let vetoed = false;
  if (sourceDeliveries.length) {
    const sourceVetoes = await Promise.all(sourceDeliveries);
    vetoed = sourceVetoes.some(Boolean);
  }

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

  return { ok: !vetoed, deliveries };
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
    if (!shouldDeliver(collector, rule, Const.Commands.Consent)) return;

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
    setMark(collector, rule, Const.Commands.Consent);
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
