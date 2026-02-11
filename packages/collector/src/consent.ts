import type { Collector, WalkerOS } from '@walkeros/core';
import { assign } from '@walkeros/core';

/**
 * Processes consent data: coerces to boolean, updates collector state.
 * Does NOT notify or process queues — caller handles that.
 */
export function processConsent(
  collector: Collector.Instance,
  data: WalkerOS.Consent,
): { update: WalkerOS.Consent; runQueue: boolean } {
  let runQueue = false;
  const update: WalkerOS.Consent = {};
  Object.entries(data).forEach(([name, granted]) => {
    const state = !!granted;
    update[name] = state;
    runQueue = runQueue || state;
  });

  collector.consent = assign(collector.consent, update);

  return { update, runQueue };
}
