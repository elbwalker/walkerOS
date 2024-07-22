import type { WalkerOS } from '@elbwalker/types';
import type { WebClient, WebDestination } from '../types';
import { assign } from '@elbwalker/utils';
import { onApply } from './on';
import { pushToDestination } from './push';

export function allowedToPush(
  instance: WebClient.Instance,
  destination: WebDestination.Destination,
): boolean {
  // Default without consent handling
  let granted = true;

  // Check for consent
  const destinationConsent = destination.config.consent;

  if (destinationConsent) {
    // Let's be strict here
    granted = false;

    // Set the current consent states
    const consentStates = instance.consent;

    // Search for a required and granted consent
    Object.keys(destinationConsent).forEach((consent) => {
      if (consentStates[consent]) granted = true;
    });
  }

  return granted;
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

  if (runQueue) {
    Object.values(destinations).forEach((destination) => {
      pushToDestination(instance, destination, undefined, false);
    });
  }
}
