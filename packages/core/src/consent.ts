import type { WalkerOS, Elb } from './types';
import { assign } from './assign';
import { pushToDestinations, createPushResult } from './destination';
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

export async function setConsent(
  collector: WalkerOS.Collector,
  data: WalkerOS.Consent,
): Promise<Elb.PushResult> {
  const { consent } = collector;

  let runQueue = false;
  const update: WalkerOS.Consent = {};
  Object.entries(data).forEach(([name, granted]) => {
    const state = !!granted;

    update[name] = state;

    // Only run queue if state was set to true
    runQueue = runQueue || state;
  });

  // Update consent state
  collector.consent = assign(consent, update);

  // Run on consent events
  onApply(collector, 'consent', undefined, update);

  // Process previous events if not disabled
  return runQueue
    ? pushToDestinations(collector)
    : createPushResult({ ok: true });
}
