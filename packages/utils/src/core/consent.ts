import type { WalkerOS } from '@elbwalker/types';
import { assign } from './assign';
import { pushToDestinations } from './destination';
import { onApply } from './on';

export function getGrantedConsent(
  required: WalkerOS.Consent | undefined,
  state: WalkerOS.Consent = {},
  individual: WalkerOS.Consent = {},
): false | WalkerOS.Consent {
  // Merge state and individual, prioritizing individual states
  const states: WalkerOS.Consent = { ...state, ...individual };

  const grantedStates: WalkerOS.Consent = {};
  let hasRequiredConsent = required === undefined;

  Object.keys(states).forEach((name) => {
    if (states[name]) {
      // consent granted
      grantedStates[name] = true;

      // Check if it's required and granted consent
      if (required && required[name]) hasRequiredConsent = true;
    }
  });

  return hasRequiredConsent ? grantedStates : false;
}

export function setConsent(
  instance: WalkerOS.Instance,
  data: WalkerOS.Consent,
) {
  const { consent } = instance;

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
  if (runQueue) return pushToDestinations(instance);
}
