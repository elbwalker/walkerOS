import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import { assign } from '@elbwalker/utils';
import { onApply } from './on';
import { pushToDestinations } from './push';

export function allowedToPush(
  instance: WebClient.Instance,
  destination: WebDestination.Destination,
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

export function setConsent(
  instance: WebClient.Instance,
  data: WalkerOS.Consent,
) {
  const { consent, destinations } = instance;

  let runQueue = false;
  const update: WalkerOS.Consent = {};
  Object.entries(data).forEach(([name, granted]) => {
    const state = !!granted;

    update[name] = state;

    // Only run queue if state was set to true
    runQueue = runQueue || state;
  });

  // Update consent state
  instance.consent = assign(consent, update);

  // Run on consent events
  onApply(instance, 'consent', undefined, update);

  // Process previous events if not disabled
  if (runQueue) pushToDestinations(instance, destinations);
}
