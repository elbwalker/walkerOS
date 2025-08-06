import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { isString, isObject, isElementOrDocument } from '@walkeros/core';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
} from './types/elb';
import { getEntities } from './walker';

// Initialize timing for performance measurements
const startTime = performance.now();

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

  // Extract entity name from event string
  const [entity] = String(
    isObject(eventOrCommand) ? eventOrCommand.event : eventOrCommand,
  ).split(' ');

  // Get data and context either from elements or parameters
  let eventData = isObject(data) ? (data as WalkerOS.Properties) : {};
  let eventContext: WalkerOS.OrderedProperties = {};

  let elemParameter: undefined | Element;
  let dataIsElem = false;

  // Check if data parameter is an element
  if (isElementOrDocument(data)) {
    elemParameter = data as Element;
    dataIsElem = true;
  }

  // Check if context parameter is an element
  if (isElementOrDocument(context)) {
    elemParameter = context as Element;
  } else if (isObject(context) && Object.keys(context).length) {
    eventContext = context as WalkerOS.OrderedProperties;
  }

  // Extract data from element if provided
  if (elemParameter) {
    const entityObj = getEntities('data-elb', elemParameter).find(
      (obj) => obj.type === entity,
    );
    if (entityObj) {
      if (dataIsElem) eventData = entityObj.data;
      eventContext = entityObj.context;
    }
  }

  // Special handling for page events
  if (entity === 'page') {
    eventData.id = eventData.id || window.location.pathname;
  }

  // Build unified event from various elb usage patterns
  const event: WalkerOS.DeepPartialEvent = {
    event: String(eventOrCommand || ''),
    data: eventData,
    context: eventContext,
    nested,
    custom,
    trigger: isString(options) ? options : '',
    timing: Math.round((performance.now() - startTime) / 10) / 100,
    source: getBrowserSource(),
  };

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
