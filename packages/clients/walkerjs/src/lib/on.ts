import type { On, WalkerOS } from '@elbwalker/types';
import type { WebClient } from '../';
import { Const, tryCatch } from '@elbwalker/utils';

export function onApply(
  instance: WebClient.Instance,
  type: On.Types,
  options?: Array<On.Options>,
  config?: WalkerOS.Consent,
) {
  const onConfig = options || instance.on[type];

  if (!onConfig) return; // No on-events registered, nothing to do

  switch (type) {
    case Const.Commands.Consent:
      onConsent(instance, onConfig as Array<On.ConsentConfig>, config);
      break;
    case Const.Commands.Ready:
      onRun(instance, onConfig as Array<On.ReadyConfig>);
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
  instance: WebClient.Instance,
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

function onRun(
  instance: WebClient.Instance,
  onConfig: Array<On.RunConfig>,
): void {
  if (instance.allowed)
    onConfig.forEach((func) => {
      tryCatch(func)(instance);
    });
}

function onSession(
  instance: WebClient.Instance,
  onConfig: Array<On.SessionConfig>,
): void {
  const { session } = instance;

  if (session)
    onConfig.forEach((func) => {
      tryCatch(func)(instance, session);
    });
}
