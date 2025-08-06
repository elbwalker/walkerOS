import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { isString, isObject } from '@walkeros/core';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
} from './types/elb';

/**
 * Translation layer that converts flexible browser source inputs
 * to the strict core collector format
 */
export function translateToCoreCollector(
  collector: Collector.Instance,
  eventOrCommand: unknown,
  data?: BrowserPushData,
  options?: BrowserPushOptions,
  context?: BrowserPushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
): Promise<Elb.PushResult> {
  // Handle walker commands - pass through directly to collector
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
    return collector.push(eventOrCommand, data as WalkerOS.Properties);
  }

  // Handle event objects - add source if missing
  if (isObject(eventOrCommand)) {
    const event = eventOrCommand;
    if (!event.source) event.source = getBrowserSource();
    return collector.push(event);
  }

  // Build unified event from various elb usage patterns
  const event: WalkerOS.DeepPartialEvent = {
    event: String(eventOrCommand || ''),
    data: isObject(data) ? (data as WalkerOS.Properties) : {},
    context: isObject(context) ? context : {},
    nested,
    custom,
    source: getBrowserSource(),
  };

  // Add trigger if options is a string
  if (isString(options)) {
    event.trigger = options;
  }

  return collector.push(event);
}

/**
 * Create source information for browser events
 */
function getBrowserSource(): WalkerOS.Source {
  return {
    type: 'browser',
    id: window.location.href,
    previous_id: document.referrer,
  };
}
