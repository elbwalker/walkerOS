import type { WalkerOS } from '@elbwalker/types';
import type { On, SourceWalkerjs } from '../';
import { Const, isArray, tryCatch } from '@elbwalker/utils';

export function on(
  instance: SourceWalkerjs.Instance,
  type: On.Types,
  option: WalkerOS.SingleOrArray<On.Options>,
) {
  const on = instance.on;
  const onType: Array<On.Options> = on[type] || [];
  const options = isArray(option) ? option : [option];

  options.forEach((option) => {
    onType.push(option);
  });

  // Update instance on state
  (on[type] as typeof onType) = onType;

  // Execute the on function directly
  onApply(instance, type, options);
}

export function onApply(
  instance: SourceWalkerjs.Instance,
  type: On.Types,
  options?: Array<On.Options>,
  config?: WalkerOS.Consent,
) {
  // Use the optionally provided options
  let onConfig = options || [];

  if (!options) {
    // Get the instance on events
    onConfig = instance.on[type] || [];

    // Add all available on events from the destinations
    Object.values(instance.destinations).forEach((destination) => {
      const onTypeConfig = destination.config.on?.[type];
      if (onTypeConfig) onConfig = onConfig.concat(onTypeConfig);
    });
  }

  if (!onConfig.length) return; // No on-events registered, nothing to do

  switch (type) {
    case Const.Commands.Consent:
      onConsent(instance, onConfig as Array<On.ConsentConfig>, config);
      break;
    case Const.Commands.Ready:
      onReady(instance, onConfig as Array<On.ReadyConfig>);
      break;
    case Const.Commands.Run:
      onRun(instance, onConfig as Array<On.RunConfig>);
      break;
    case Const.Commands.Session:
      onSession(instance, onConfig as Array<On.SessionConfig>);
      break;
    default:
      break;
  }
}

function onConsent(
  instance: SourceWalkerjs.Instance,
  onConfig: Array<On.ConsentConfig>,
  currentConsent?: WalkerOS.Consent,
): void {
  const consentState = currentConsent || instance.consent;

  onConfig.forEach((consentConfig) => {
    // Collect functions whose consent keys match the rule keys directly
    // Directly execute functions whose consent keys match the rule keys
    Object.keys(consentState) // consent keys
      .filter((consent) => consent in consentConfig) // check for matching rule keys
      .forEach((consent) => {
        // Execute the function
        tryCatch(consentConfig[consent])(instance, consentState);
      });
  });
}

function onReady(
  instance: SourceWalkerjs.Instance,
  onConfig: Array<On.ReadyConfig>,
): void {
  if (instance.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(instance);
    });
}

function onRun(
  instance: SourceWalkerjs.Instance,
  onConfig: Array<On.RunConfig>,
): void {
  if (instance.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(instance);
    });
}

function onSession(
  instance: SourceWalkerjs.Instance,
  onConfig: Array<On.SessionConfig>,
): void {
  if (!instance.config.session) return; // Session handling is disabled

  onConfig.forEach((func) => {
    tryCatch(func)(instance, instance.session);
  });
}
