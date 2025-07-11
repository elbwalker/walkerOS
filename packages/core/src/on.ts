import type { On, WalkerOS } from './types';
import { isArray } from './is';
import { Const } from './constants';
import { tryCatch } from './tryCatch';

/**
 * Registers a callback for a specific event type.
 *
 * @param collector The walkerOS collector instance.
 * @param type The type of the event to listen for.
 * @param option The callback function or an array of callback functions.
 */
export function on(
  collector: WalkerOS.Collector,
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
  onApply(collector, type, options);
}

/**
 * Applies all registered callbacks for a specific event type.
 *
 * @param collector The walkerOS collector instance.
 * @param type The type of the event to apply the callbacks for.
 * @param options The options for the callbacks.
 * @param config The consent configuration.
 */
export function onApply(
  collector: WalkerOS.Collector,
  type: On.Types,
  options?: Array<On.Options>,
  config?: WalkerOS.Consent,
) {
  // Use the optionally provided options
  let onConfig = options || [];

  if (!options) {
    // Get the collector on events
    onConfig = collector.on[type] || [];

    // Add all available on events from the destinations
    Object.values(collector.destinations).forEach((destination) => {
      const onTypeConfig = destination.config.on?.[type];
      if (onTypeConfig) onConfig = onConfig.concat(onTypeConfig);
    });
  }

  if (!onConfig.length) return; // No on-events registered, nothing to do

  switch (type) {
    case Const.Commands.Consent:
      onConsent(collector, onConfig as Array<On.ConsentConfig>, config);
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
      break;
  }
}

function onConsent(
  collector: WalkerOS.Collector,
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
  collector: WalkerOS.Collector,
  onConfig: Array<On.ReadyConfig>,
): void {
  if (collector.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(collector);
    });
}

function onRun(
  collector: WalkerOS.Collector,
  onConfig: Array<On.RunConfig>,
): void {
  if (collector.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(collector);
    });
}

function onSession(
  collector: WalkerOS.Collector,
  onConfig: Array<On.SessionConfig>,
): void {
  if (!collector.config.session) return; // Session handling is disabled

  onConfig.forEach((func) => {
    tryCatch(func)(collector, collector.session);
  });
}
