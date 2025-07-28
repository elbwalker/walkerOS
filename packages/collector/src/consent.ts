import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import { assign } from '@walkeros/core';
import { pushToDestinations, createPushResult } from './destination';
import { onApply } from './on';

/**
 * Sets the consent state and processes the queue.
 *
 * @param collector - The walkerOS collector instance.
 * @param data - The consent data to set.
 * @returns The result of the push operation.
 */
export async function setConsent(
  collector: Collector.Instance,
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
