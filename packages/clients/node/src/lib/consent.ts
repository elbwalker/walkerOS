import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient } from '../types';
import { isSameType } from '@elbwalker/utils';
import { pushToDestinations } from './push';

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
