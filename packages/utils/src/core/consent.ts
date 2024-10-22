import type { WalkerOS } from '@elbwalker/types';

export function getGrantedConsent(
  state: WalkerOS.Consent,
  required: WalkerOS.Consent = {},
  event?: WalkerOS.Event,
): false | WalkerOS.Consent {
  const requiredStates = Object.keys(required);

  // No explicit consent required
  if (!requiredStates.length) return {};

  const grantedStates: WalkerOS.Consent = {};

  // Search for required and granted consent
  requiredStates.forEach((name) => {
    // Check if either instance or event granted consent
    if (state[name] || event?.consent?.[name]) grantedStates[name] = true;
  });

  // Return the granted consent states or false
  return Object.keys(grantedStates).length ? grantedStates : false;
}
