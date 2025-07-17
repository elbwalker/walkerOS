import type { WalkerOS, Elb } from '@walkerOS/core';
import { isString, isObject, isDefined } from '@walkerOS/core';
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
  collector: WalkerOS.Collector,
  eventOrCommand: unknown,
  data?: BrowserPushData,
  options?: BrowserPushOptions,
  context?: BrowserPushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
): Promise<Elb.PushResult> {
  // Handle walker commands - pass command and data only
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
    if (eventOrCommand === 'walker config') {
      return (
        collector.push as (
          event: 'walker config',
          config: WalkerOS.DeepPartial<WalkerOS.Config>,
        ) => Promise<Elb.PushResult>
      )('walker config', data as WalkerOS.DeepPartial<WalkerOS.Config>);
    } else if (eventOrCommand === 'walker consent') {
      return (
        collector.push as (
          event: 'walker consent',
          consent: WalkerOS.Consent,
        ) => Promise<Elb.PushResult>
      )('walker consent', data as WalkerOS.Consent);
    } else if (eventOrCommand === 'walker user') {
      return (
        collector.push as (
          event: 'walker user',
          user: WalkerOS.User,
        ) => Promise<Elb.PushResult>
      )('walker user', data as WalkerOS.User);
    } else if (eventOrCommand === 'walker run') {
      return (
        collector.push as (
          event: 'walker run',
          options: WalkerOS.DeepPartial<WalkerOS.Config>,
        ) => Promise<Elb.PushResult>
      )('walker run', data as WalkerOS.DeepPartial<WalkerOS.Config>);
    } else if (eventOrCommand === 'walker hook') {
      // This is more complex due to the generic nature, but we can't handle it properly here
      // Fall through to the event handling
    }
  }

  // Handle event objects
  if (isObject(eventOrCommand)) {
    return collector.push(eventOrCommand as WalkerOS.DeepPartialEvent);
  }

  // Handle string events with additional parameters
  if (isString(eventOrCommand) && eventOrCommand.length > 0) {
    const event: WalkerOS.DeepPartialEvent = {
      event: eventOrCommand,
      data: normalizeData(data || {}),
      context: normalizeContext(context || {}),
      custom: custom || {},
      nested: nested || [],
    };

    // Add trigger if options is a string (likely a trigger)
    if (isString(options)) {
      (event as WalkerOS.DeepPartialEvent & { trigger?: string }).trigger =
        options;
    }

    return collector.push(event);
  }

  // For malformed commands, return a resolved promise without calling push
  if (!isDefined(eventOrCommand)) {
    return Promise.resolve({
      ok: true,
      successful: [],
      queued: [],
      failed: [],
    });
  }

  // Handle completely flexible format - build event object
  const event: WalkerOS.DeepPartialEvent = {
    event: String(eventOrCommand || ''),
    data: normalizeData(data || {}),
    context: normalizeContext(context || {}),
    custom: custom || {},
    nested: nested || [],
  };

  // Add trigger if options is a string (likely a trigger)
  if (isString(options)) {
    (event as WalkerOS.DeepPartialEvent & { trigger?: string }).trigger =
      options;
  }

  return collector.push(event);
}

/**
 * Normalize data to WalkerOS.Properties format
 */
// @TODO There is a util for this
function normalizeData(data: BrowserPushData | undefined): WalkerOS.Properties {
  if (!data) return {};

  // If it's already properties, return as-is
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as WalkerOS.Properties;
  }

  // Convert other types to properties
  return { value: data };
}

/**
 * Normalize context to WalkerOS.OrderedProperties format
 */
// @TODO This is not correct
function normalizeContext(
  context: BrowserPushContext | undefined,
): WalkerOS.OrderedProperties {
  if (!context) return {};

  // If it's already ordered properties, return as-is
  if (typeof context === 'object' && !('nodeType' in context)) {
    return context as WalkerOS.OrderedProperties;
  }

  // Convert Element to ordered properties
  if (context && 'nodeType' in context) {
    const element = context as Element;
    return {
      tagName: [element.tagName.toLowerCase(), 0],
      id: element.id ? [element.id, 1] : undefined,
      className: element.className ? [element.className, 2] : undefined,
    };
  }

  return {};
}
