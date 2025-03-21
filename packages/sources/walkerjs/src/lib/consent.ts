import type { WalkerOS } from '@elbwalker/types';
import type { SourceWalkerjs } from '../types';
import { assign, pushToDestinations } from '@elbwalker/utils';
import { onApply } from './on';

export function setConsent(
  instance: SourceWalkerjs.Instance,
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
  if (runQueue) return pushToDestinations(instance, destinations);
}
