import type { Collector } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  push: Collector.PushFn,
): Promise<{ id?: string; error?: string; status?: number }> {
  try {
    // A batch element that is not an object carries no event fields. Treat it
    // as an empty event so the collector's gate classifies it as invalid
    // input, rather than throwing here and reporting a server fault.
    const { event, ...rest } = isObject(eventReq) ? eventReq : {};
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
