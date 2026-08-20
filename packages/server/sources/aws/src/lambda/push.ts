import type { Collector, WalkerOS, Logger } from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  push: Collector.PushFn,
  logger?: Logger.Instance,
  requestId?: string,
): Promise<{ id?: string; error?: string; status?: number }> {
  try {
    const result = await push({
      name: eventReq.event,
      data: (eventReq.data || {}) as WalkerOS.Properties,
      context: eventReq.context as WalkerOS.OrderedProperties | undefined,
      user: eventReq.user as WalkerOS.User | undefined,
      globals: eventReq.globals as WalkerOS.Properties | undefined,
      consent: eventReq.consent as WalkerOS.Consent | undefined,
    });

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
    // Log with structured context - per using-logger skill
    logger?.error('Event processing failed', {
      error,
      eventName: eventReq.event,
      requestId,
    });
    // A rejected push promise is a server fault: the collector resolves
    // pipeline failures, so a rejection is exceptional by construction.
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}
