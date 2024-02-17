import type { On } from '@elbwalker/types';
import type { WebClient } from '../';
import { Const, tryCatch } from '@elbwalker/utils';

export function onApply(
  instance: WebClient.Instance,
  type: On.Types,
  options?: Array<On.Options>,
) {
  const onConfig = options || instance.config.on[type];

  if (!onConfig) return; // No on-events registered, nothing to do

  switch (type) {
    case Const.Commands.Consent:
      onConsent(instance, onConfig as Array<On.ConsentConfig>);
      break;
    case Const.Commands.Run:
      // @TODO
      break;
    default:
      break;
  }
}

function onConsent(
  instance: WebClient.Instance,
  onConfig: Array<On.ConsentConfig>,
): void {
  const consentState = instance.config.consent;

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
