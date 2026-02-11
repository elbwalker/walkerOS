import type { Collector, On, WalkerOS, Destination } from '@walkeros/core';
import { isArray } from '@walkeros/core';
import { Const } from './constants';
import { tryCatch, tryCatchAsync } from '@walkeros/core';
import { mergeEnvironments } from './destination';

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
  option: WalkerOS.SingleOrArray<On.Options>,
) {
  const on = collector.on;
  const onType: Array<On.Options> = on[type] || [];
  const options = isArray(option) ? option : [option];

  options.forEach((option) => {
    onType.push(option);
  });

  // Update collector on state
  (on[type] as typeof onType) = onType;

  // Execute the on function directly
  await onApply(collector, type, options);
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
  options?: Array<On.Options>,
  config?: unknown,
): Promise<boolean> {
  // Use the optionally provided options
  let onConfig = options || [];

  if (!options) {
    // Get the collector on events
    onConfig = collector.on[type] || [];
  }

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

  let vetoed = false;
  for (const source of Object.values(collector.sources)) {
    if (source.on) {
      const result = await tryCatchAsync(source.on)(type, contextData);
      if (result === false) vetoed = true;
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

      // Call immediately using shared helper
      callDestinationOn(collector, destination, destId, type, contextData);
    }
  });

  if (!onConfig.length) return !vetoed;

  switch (type) {
    case Const.Commands.Consent:
      onConsent(
        collector,
        onConfig as Array<On.ConsentConfig>,
        config as WalkerOS.Consent,
      );
      break;
    case Const.Commands.Ready:
      onReady(collector, onConfig as Array<On.ReadyConfig>);
      break;
    case Const.Commands.Run:
      onRun(collector, onConfig as Array<On.RunConfig>);
      break;
    case Const.Commands.Session:
      onSession(collector, onConfig as Array<On.SessionConfig>);
      break;
    default:
      // Generic handler for user, custom, globals, config, and custom events
      onConfig.forEach((func) => {
        if (typeof func === 'function') {
          tryCatch(func as On.GenericFn)(collector, contextData);
        }
      });
      break;
  }

  return !vetoed;
}

function onConsent(
  collector: Collector.Instance,
  onConfig: Array<On.ConsentConfig>,
  currentConsent?: WalkerOS.Consent,
): void {
  const consentState = currentConsent || collector.consent;

  onConfig.forEach((consentConfig) => {
    // Collect functions whose consent keys match the rule keys directly
    // Directly execute functions whose consent keys match the rule keys
    Object.keys(consentState) // consent keys
      .filter((consent) => consent in consentConfig) // check for matching rule keys
      .forEach((consent) => {
        // Execute the function
        tryCatch(consentConfig[consent])(collector, consentState);
      });
  });
}

function onReady(
  collector: Collector.Instance,
  onConfig: Array<On.ReadyConfig>,
): void {
  if (collector.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(collector);
    });
}

function onRun(
  collector: Collector.Instance,
  onConfig: Array<On.RunConfig>,
): void {
  if (collector.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(collector);
    });
}

function onSession(
  collector: Collector.Instance,
  onConfig: Array<On.SessionConfig>,
): void {
  if (!collector.session) return;

  onConfig.forEach((func) => {
    tryCatch(func)(collector, collector.session);
  });
}
