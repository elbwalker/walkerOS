import type { Collector } from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  push: Collector.PushFn,
): Promise<{ id?: string; error?: string; status?: number }> {
  try {
    const { event, ...rest } = eventReq;
    const result = await push({ ...rest, name: rest.name ?? event });

    if (result?.ok === false) {
      if (result.invalid === true) {
        return { error: result.error ?? 'Invalid event', status: 400 };
      }
      return {
        error: result.error ?? 'Event was not processed',
        status: 500,
      };
    }

    return { id: result?.event?.id };
  } catch (error) {
    // A rejected push promise is a server fault: the collector resolves
    // pipeline failures, so a rejection is exceptional by construction.
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}
