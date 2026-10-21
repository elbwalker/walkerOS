import type { Collector, EventOutcome, Logger } from '@walkeros/core';
import {
  INTERNAL_SERVER_ERROR,
  isObject,
  pushResultToOutcome,
} from '@walkeros/core';
import type { EventRequest } from './types';

export async function processEvent(
  eventReq: EventRequest,
  push: Collector.PushFn,
  logger: Logger.Instance,
): Promise<EventOutcome> {
  try {
    // A batch element that is not an object carries no event fields. Treat it
    // as an empty event so the collector's gate classifies it as invalid
    // input, rather than throwing here and reporting a server fault.
    const { event, ...rest } = isObject(eventReq) ? eventReq : {};
    const result = await push({ ...rest, name: rest.name ?? event });

    return pushResultToOutcome(result);
  } catch (error) {
    // A rejected push promise is a server fault: the collector resolves
    // pipeline failures, so a rejection is exceptional by construction. Its
    // message is logged, never answered.
    logger.error('Event processing failed', {
      error,
      eventName: isObject(eventReq)
        ? (eventReq.name ?? eventReq.event)
        : undefined,
    });
    return { error: INTERNAL_SERVER_ERROR, status: 500 };
  }
}
