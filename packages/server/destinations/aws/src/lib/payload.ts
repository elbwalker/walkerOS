import type { WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';

/**
 * What one record or message carries: the mapped `data` when the mapping
 * produced an object, else the full event.
 */
export function toPayload(event: WalkerOS.Event, data?: unknown): object {
  return isObject(data) ? data : event;
}
