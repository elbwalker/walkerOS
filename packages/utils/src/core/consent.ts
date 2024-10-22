import type { WalkerOS } from '@elbwalker/types';

export function getGrantedConsent(
  state: WalkerOS.Consent,
  required: WalkerOS.Consent = {},
  event?: WalkerOS.Event, // Should also be the consent and called individual
): false | WalkerOS.Consent {
  // Merge state and event.consent, prioritizing event.consent
  const states: WalkerOS.Consent = { ...state, ...event?.consent };

  const grantedStates: WalkerOS.Consent = {};
  let hasRequiredConsent = false;

  Object.keys(states).forEach((name) => {
    if (states[name]) {
      // consent granted
      grantedStates[name] = true;

      // Check if it's required and granted consent
      if (required[name]) hasRequiredConsent = true;
    }
  });

  return hasRequiredConsent ? grantedStates : false;
}
