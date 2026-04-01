import type { Collector, WalkerOS } from '@walkeros/core';
import { assign } from '@walkeros/core';

/**
 * Processes consent data: coerces to boolean, updates collector state.
 * Does NOT notify or process queues — caller handles that.
 */
export function processConsent(
  collector: Collector.Instance,
  data: WalkerOS.Consent,
): { update: WalkerOS.Consent } {
  const update: WalkerOS.Consent = {};
  Object.entries(data).forEach(([name, granted]) => {
    update[name] = !!granted;
  });

  collector.consent = assign(collector.consent, update);

  return { update };
}
