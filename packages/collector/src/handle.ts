import type {
  Collector,
  WalkerOS,
  Destination,
  Elb,
  Hooks,
  On,
} from '@walkeros/core';
import { Const } from './constants';
import {
  addDestination,
  pushToDestinations,
  createPushResult,
} from './destination';
import { assign, getSpanId, isFunction, isString } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { processConsent } from './consent';
import { on, onApply, redeliverStateAtRun, enterCascade } from './on';
import { reconcilePending } from './pending';
import { destroyAllSteps } from './shutdown';
import type { RunState } from './types/collector';

// Replaced at build time by tsup's `define` (see packages/config/tsup).
declare const __VERSION__: string;

/**
 * Record a reactive-state mutation: bump the global `stateVersion` and stamp the
 * changed cell's own version. The per-cell stamp lets delivery dedup be per-cell
 * (a subscriber owed two cells at once receives both), while `stateVersion`
 * stays the monotonic tick used by the cascade guard.
 */
function bumpCell(collector: Collector.Instance, type: string): void {
  collector.stateVersion++;
  collector.cellVersion[type] = collector.stateVersion;
}

/**
 * Handles common commands.
 *
 * @param collector The walkerOS collector instance.
 * @param action The action to handle.
 * @param data The data to handle.
 * @returns A promise that resolves with the push result or undefined.
 */
export async function commonHandleCommand(
  collector: Collector.Instance,
  action: string,
  data?: unknown,
): Promise<Elb.PushResult> {
  let result: Elb.PushResult | undefined;
  let onData: unknown;
  let shouldNotify = false;

  // Open the bounded-recursion cascade tracker for the OUTERMOST top-level
  // command. Nested commands emitted by reacting state callbacks find it
  // already open and reuse it; teardown is a no-op for them, so the
  // per-(subscriber, cell-type) counters are scoped to this top-level command
  // and reset when it returns.
  const exitCascade = enterCascade(collector);
  try {
    return await runHandleCommand();
  } finally {
    exitCascade();
  }

  async function runHandleCommand(): Promise<Elb.PushResult> {
    switch (action) {
      case Const.Commands.Config:
        if (isObject(data)) {
          assign(collector.config, data as Partial<Collector.Config>, {
            shallow: false,
          });
          onData = data;
          shouldNotify = true;
        }
        break;

      case Const.Commands.Consent:
        if (isObject(data)) {
          const { update } = processConsent(
            collector,
            data as WalkerOS.Consent,
          );
          bumpCell(collector, Const.Commands.Consent);
          onData = update;
          shouldNotify = true;
        }
        break;

      case Const.Commands.Custom:
        if (isObject(data)) {
          collector.custom = assign(
            collector.custom,
            data as WalkerOS.Properties,
          );
          bumpCell(collector, Const.Commands.Custom);
          onData = data;
          shouldNotify = true;
        }
        break;

      case Const.Commands.Destination:
        if (
          isObject(data) &&
          'code' in data &&
          isObject((data as Destination.Init).code)
        ) {
          result = await addDestination(collector, data as Destination.Init);
        }
        break;

      case Const.Commands.Globals:
        if (isObject(data)) {
          collector.globals = assign(
            collector.globals,
            data as WalkerOS.Properties,
          );
          bumpCell(collector, Const.Commands.Globals);
          onData = data;
          shouldNotify = true;
        }
        break;

      case Const.Commands.Hook:
        if (
          isObject(data) &&
          isString((data as { name?: unknown }).name) &&
          isFunction((data as { fn?: unknown }).fn)
        ) {
          const { name, fn } = data as {
            name: string;
            fn: WalkerOS.AnyFunction;
          };
          collector.hooks[name as keyof Hooks.Functions] = fn;
          onData = data;
          shouldNotify = true;
        }
        break;

      case Const.Commands.On:
        if (isObject(data) && isString((data as { type?: unknown }).type)) {
          const { type, rules } = data as {
            type: On.Types;
            rules: WalkerOS.SingleOrArray<On.Subscription>;
          };
          await on(collector, type, rules);
        }
        break;

      case Const.Commands.Ready:
        shouldNotify = true;
        break;

      case Const.Commands.Run:
        result = await runCollector(collector, data as RunState);
        shouldNotify = true;
        break;

      case Const.Commands.Session:
        shouldNotify = true;
        break;

      case Const.Commands.Shutdown:
        // Idempotency guard: re-entrancy must not re-run destroyAllSteps and
        // double-close writers, destinations, or stores. The first shutdown
        // sets the flag and runs the full sequence; a second command no-ops.
        if (!collector.hasShutdown) {
          collector.hasShutdown = true;
          await destroyAllSteps(collector);
        }
        break;

      case Const.Commands.User:
        if (isObject(data)) {
          assign(collector.user, data as WalkerOS.User, { shallow: false });
          bumpCell(collector, Const.Commands.User);
          onData = data;
          shouldNotify = true;
        }
        break;
    }

    // Single notification + flush point for all state-mutation commands
    if (shouldNotify) {
      await onApply(collector, action as On.Types, undefined, onData);
      result = await pushToDestinations(collector);
    }

    return result || createPushResult({ ok: true });
  }
}

/**
 * Builds the partial event handed to `createEvent`, injecting the default
 * `timing` (elapsed since the collector started) and the collector `source`
 * meta. Event-provided values override the defaults.
 *
 * @param collector The walkerOS collector instance.
 * @param event The incoming partial event.
 * @returns The partial event with defaults applied.
 */
export function prepareEvent(
  collector: Collector.Instance,
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.PartialEvent {
  return {
    timing: Math.round((Date.now() - collector.timing) / 10) / 100,
    source: { type: 'collector', schema: '4', version: __VERSION__ },
    ...event,
  } as WalkerOS.PartialEvent;
}

/**
 * Creates a full event from a partial event.
 *
 * @param collector The walkerOS collector instance.
 * @param partialEvent The partial event to transform.
 * @returns The full event.
 */
export function createEvent(
  collector: Collector.Instance,
  partialEvent: WalkerOS.PartialEvent,
): WalkerOS.Event {
  if (!partialEvent.name) throw new Error('Event name is required');

  const [entityValue, actionValue] = partialEvent.name.split(' ');
  if (!entityValue || !actionValue) throw new Error('Event name is invalid');

  const {
    timestamp = Date.now(),
    name = `${entityValue} ${actionValue}`,
    data = {},
    context = {},
    globals = collector.globals,
    custom = {},
    user = collector.user,
    nested = [],
    consent = collector.consent,
    id = getSpanId(),
    trigger = '',
    entity = entityValue,
    action = actionValue,
    timing = 0,
    source = { type: 'collector', schema: '4' },
  } = partialEvent;

  return {
    name,
    data,
    context,
    globals,
    custom,
    user,
    nested,
    consent,
    id,
    trigger,
    entity,
    action,
    timestamp,
    timing,
    source,
  };
}

/**
 * Enriches a partial event into a full event by applying the collector defaults
 * (`prepareEvent`) and then building the complete event (`createEvent`). This is
 * the single enrichment entry point shared by the production push path and
 * simulation, so both produce identical events.
 *
 * @param collector The walkerOS collector instance.
 * @param event The incoming partial event.
 * @returns The full event.
 */
export function enrichEvent(
  collector: Collector.Instance,
  event: WalkerOS.DeepPartialEvent,
): WalkerOS.Event {
  return createEvent(collector, prepareEvent(collector, event));
}

/**
 * Runs the collector by setting it to allowed state and processing queued events.
 *
 * @param collector The walkerOS collector instance.
 * @param state Optional state to merge with the collector (user, globals, consent, custom).
 * @returns A promise that resolves with the push result.
 */
export async function runCollector(
  collector: Collector.Instance,
  state?: RunState,
): Promise<Elb.PushResult> {
  // Set the collector to allowed state
  collector.allowed = true;

  // Update timing for this run
  collector.timing = Date.now();

  // Update collector state if provided
  if (state) {
    // Update consent if provided
    if (state.consent) {
      collector.consent = assign(collector.consent, state.consent);
      bumpCell(collector, Const.Commands.Consent);
    }

    // Update user if provided
    if (state.user) {
      collector.user = assign(collector.user, state.user);
      bumpCell(collector, Const.Commands.User);
    }

    // Update globals if provided
    if (state.globals) {
      collector.globals = assign(
        collector.config.globalsStatic || {},
        state.globals,
      );
      bumpCell(collector, Const.Commands.Globals);
    }

    // Update custom if provided
    if (state.custom) {
      collector.custom = assign(collector.custom, state.custom);
      bumpCell(collector, Const.Commands.Custom);
    }
  }

  // Reset destination queues
  Object.values(collector.destinations).forEach((destination) => {
    destination.queuePush = [];
  });

  // Reset collector queue for this run
  collector.queue = [];

  // Increase round counter
  collector.round++;

  // Run barrier — activate first, then re-deliver. The collector just became
  // `allowed` and any RunState cells were merged + bumped above, so a step
  // parked on `require` (e.g. a source gated on consent that only arrives via
  // the run state) can now activate. Reconcile BEFORE redeliver so the
  // freshly-started step is in `collector.sources` when redeliver re-broadcasts
  // owed state, and thus receives its consent/user/globals/custom delivery at
  // the barrier rather than missing it.
  await reconcilePending(collector);

  // Run barrier: the collector just became `allowed`. Re-deliver each non-empty
  // recorded state cell to subscribers owed a pre-run deferral (mark <
  // stateVersion) exactly once, so their reactions (e.g. a session source's
  // `session start` push) emit into the now-open, consent-gated pipeline. The
  // per-subscriber high-water mark guarantees exactly-once; this is the narrow
  // path (no require-decrement / queueOn flush). The subsequent `onApply(…,
  // 'run', …)` from commonHandleCommand is a lifecycle broadcast and does not
  // collide with these state re-deliveries.
  await redeliverStateAtRun(collector);

  // Process any queued events now that the collector is allowed
  const result = await pushToDestinations(collector);

  return result;
}
