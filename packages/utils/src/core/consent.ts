import type { Destination, WalkerOS } from '@elbwalker/types';

export function getGrantedConsent(
  instance: WalkerOS.Instance, // @TODO eventually change to WalkerOS.Consent
  destination: Destination.Destination,
  event?: WalkerOS.Event,
): false | WalkerOS.Consent {
  const requiredStates = Object.keys(destination.config.consent || {});

  // No explicit consent required
  if (!requiredStates.length) return {};

  const grantedStates: WalkerOS.Consent = {};

  // Search for required and granted consent
  requiredStates.forEach((consent) => {
    // Check if either instance or event granted consent
    if (instance.consent[consent] || event?.consent?.[consent])
      grantedStates[consent] = true;
  });

  // Return the granted consent states or false
  return Object.keys(grantedStates).length ? grantedStates : false;
}
