import type { Collector, WalkerOS } from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  push: Collector.PushFn,
): Promise<{ id?: string; error?: string }> {
  try {
    const result = await push({
      name: eventReq.event,
      data: (eventReq.data || {}) as WalkerOS.Properties,
      context: eventReq.context as WalkerOS.OrderedProperties | undefined,
      user: eventReq.user as WalkerOS.User | undefined,
      globals: eventReq.globals as WalkerOS.Properties | undefined,
      consent: eventReq.consent as WalkerOS.Consent | undefined,
    });

    return { id: result?.event?.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
