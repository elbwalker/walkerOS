import type { Collector, On, WalkerOS, Destination } from '@walkeros/core';
import { isArray } from '@walkeros/core';
import { Const } from './constants';
import { tryCatch, tryCatchAsync } from '@walkeros/core';
import { mergeEnvironments } from './destination';
import { activatePending } from './pending';
import { flushSourceQueueOn, isSourceStarted } from './source';

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

  tryCatch(destination.on)(type, context);
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
  // Calculate context data once for all sources and destinations
  let contextData: unknown;

  switch (type) {
    case Const.Commands.Consent:
      contextData = config || collector.consent;
      break;
    case Const.Commands.Session:
      contextData = collector.session;
      break;
    case Const.Commands.User:
      contextData = config || collector.user;
      break;
    case Const.Commands.Custom:
      contextData = config || collector.custom;
      break;
    case Const.Commands.Globals:
      contextData = config || collector.globals;
      break;
    case Const.Commands.Config:
      contextData = config || collector.config;
      break;
    case Const.Commands.Ready:
    case Const.Commands.Run:
    default:
      contextData = undefined;
      break;
  }

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
      options.forEach((func) => {
        if (typeof func === 'function') {
          tryCatch(func as On.GenericFn)(contextData, ctx);
        }
      });
      break;
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
  // Use the optionally provided options
  let onConfig = options || [];

  if (!options) {
    // Get the collector on events
    onConfig = collector.on[type] || [];
  }

  // Calculate context data once for source/destination broadcast
  let contextData: unknown;

  switch (type) {
    case Const.Commands.Consent:
      contextData = config || collector.consent;
      break;
    case Const.Commands.Session:
      contextData = collector.session;
      break;
    case Const.Commands.User:
      contextData = config || collector.user;
      break;
    case Const.Commands.Custom:
      contextData = config || collector.custom;
      break;
    case Const.Commands.Globals:
      contextData = config || collector.globals;
      break;
    case Const.Commands.Config:
      contextData = config || collector.config;
      break;
    case Const.Commands.Ready:
    case Const.Commands.Run:
    default:
      contextData = undefined;
      break;
  }

  let vetoed = false;
  // Per-source require decrement + gated on() delivery.
  // Sources are not "started" until config.init === true AND config.require is empty.
  // Unstarted sources have their on() events queued in instance.queueOn
  // and replayed once they start.
  for (const source of Object.values(collector.sources)) {
    if (source.config.require?.length) {
      const idx = source.config.require.indexOf(type);
      if (idx !== -1) source.config.require.splice(idx, 1);
    }

    if (!source.on) continue;

    if (isSourceStarted(source)) {
      const result = await tryCatchAsync(source.on)(type, contextData);
      if (result === false) vetoed = true;
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
  for (const source of Object.values(collector.sources)) {
    if (isSourceStarted(source) && source.queueOn?.length) {
      await flushSourceQueueOn(collector, source);
    }
  }

  // Activate pending destinations whose require conditions are met.
  // (Pending sources are gone — their require is tracked in source.config.require
  // and gated via queueOn above.)
  if (Object.keys(collector.pending.destinations).length > 0) {
    await activatePending(collector, type);
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
    // Execute every handler whose consent key is present in the current state.
    Object.keys(consentState)
      .filter((key) => key in rule)
      .forEach((key) => {
        tryCatch(rule[key])(consentState, ctx);
      });
  });
}

function onReady(
  collector: Collector.Instance,
  onConfig: Array<On.ReadyFn>,
): void {
  if (!collector.allowed) return;
  const ctx = buildOnContext(collector, Const.Commands.Ready);
  onConfig.forEach((func) => {
    tryCatch(func)(undefined, ctx);
  });
}

function onRun(collector: Collector.Instance, onConfig: Array<On.RunFn>): void {
  if (!collector.allowed) return;
  const ctx = buildOnContext(collector, Const.Commands.Run);
  onConfig.forEach((func) => {
    tryCatch(func)(undefined, ctx);
  });
}

function onSession(
  collector: Collector.Instance,
  onConfig: Array<On.SessionFn>,
): void {
  if (!collector.session) return;
  const ctx = buildOnContext(collector, Const.Commands.Session);
  onConfig.forEach((func) => {
    tryCatch(func)(collector.session, ctx);
  });
}
