import type { WalkerOS } from '@elbwalker/types';
import type { WebClient } from '../types';
import { assign } from '@elbwalker/utils';
import { onApply } from './on';
import { pushToDestination } from './push';

export function setConsent(
  instance: WebClient.Instance,
  data: WalkerOS.Consent,
) {
  const { consent, destinations, globals, user } = instance;

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
      const queue = destination.queue || [];

      // Try to push and remove successful ones from queue
      destination.queue = queue.filter((event) => {
        // Update previous values with the current state
        event.consent = instance.consent;
        event.globals = globals;
        event.user = user;

        return !pushToDestination(instance, destination, event, false);
      });
    });
  }
}

export function setUserIds(instance: WebClient.Instance, data: WalkerOS.User) {
  assign(instance.user, data, { shallow: false });
}
