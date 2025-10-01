import type { Elb, WalkerOS } from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  elb: Elb.Fn,
): Promise<{ id?: string; error?: string }> {
  try {
    const result = await elb(
      eventReq.event,
      (eventReq.data || {}) as WalkerOS.Properties,
    );

    return { id: result?.event?.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
