import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from '../types';
import { isSameType } from '@elbwalker/utils';
import { pushToDestinations } from './push';

export function allowedToPush(
  instance: NodeClient.Instance,
  destination: NodeDestination.Destination,
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

export async function setConsent(
  instance: NodeClient.Instance,
  data: unknown = {},
) {
  if (!isSameType(data, {} as WalkerOS.Consent)) return;

  let runQueue = false;
  Object.entries(data).forEach(([consent, granted]) => {
    const state = !!granted;

    instance.consent[consent] = state;

    // Only run queue if state was set to true
    runQueue = runQueue || state;
  });

  if (runQueue) return await pushToDestinations(instance);
}
