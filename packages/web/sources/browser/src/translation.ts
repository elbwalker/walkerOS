import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import {
  isString,
  isObject,
  isDefined,
  isSameType,
  isElementOrDocument,
} from '@walkeros/core';
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
  // Handle walker commands - pass command and data only
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
    if (eventOrCommand === 'walker config') {
      return (
        collector.push as (
          event: 'walker config',
          config: WalkerOS.DeepPartial<Collector.Instance['config']>,
        ) => Promise<Elb.PushResult>
      )(
        'walker config',
        data as WalkerOS.DeepPartial<Collector.Instance['config']>,
      );
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
          options: WalkerOS.DeepPartial<Collector.Instance['config']>,
        ) => Promise<Elb.PushResult>
      )(
        'walker run',
        data as WalkerOS.DeepPartial<Collector.Instance['config']>,
      );
    } else if (eventOrCommand === 'walker hook') {
      // This is more complex due to the generic nature, but we can't handle it properly here
      // Fall through to the event handling
    }
  }

  // Handle event objects
  if (isObject(eventOrCommand)) {
    const event = eventOrCommand as WalkerOS.DeepPartialEvent;

    // If event doesn't have source info, add it
    if (!event.source) event.source = getBrowserSource();

    return collector.push(event);
  }

  // Handle string events with additional parameters
  if (isString(eventOrCommand) && eventOrCommand.length > 0) {
    const event: WalkerOS.DeepPartialEvent = {
      event: eventOrCommand,
      data: normalizeData(data || {}),
      context: normalizeContext(context || {}),
      custom,
      nested,
      source: getBrowserSource(),
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
    custom,
    nested,
    source: getBrowserSource(),
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
 * Uses the same logic as legacy web collector
 */
function normalizeData(data: BrowserPushData | undefined): WalkerOS.Properties {
  if (!data) return {};

  // Use the same logic as legacy: if it's Properties, use it; otherwise empty object
  return isSameType(data, {} as WalkerOS.Properties) ? data : {};
}

/**
 * Normalize context to WalkerOS.OrderedProperties format
 */
function normalizeContext(
  context: BrowserPushContext | undefined,
): WalkerOS.OrderedProperties {
  if (!context) return {};

  // Handle elements separately - they don't become context directly
  if (isElementOrDocument(context)) {
    return {};
  }

  // Only use objects with content as context
  if (isObject(context) && Object.keys(context).length) {
    return context as WalkerOS.OrderedProperties;
  }

  return {};
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
