import type { WalkerOS, Elb, Collector } from '@walkeros/core';
import { isString, isObject, isElementOrDocument } from '@walkeros/core';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
} from './types/elb';
import type { Context } from './types';
import { getEntities, getGlobals } from './walker';

// Initialize timing for performance measurements
const startTime = performance.now();

/**
 * Translation layer that converts flexible browser source inputs
 * to the strict core collector format
 */
export function translateToCoreCollector(
  context: Context,
  eventOrCommand: unknown,
  data?: BrowserPushData,
  options?: BrowserPushOptions,
  pushContext?: BrowserPushContext,
  nested?: WalkerOS.Entities,
  custom?: WalkerOS.Properties,
): Promise<Elb.PushResult> {
  const { elb, settings } = context;
  // Handle walker commands - pass through directly to elb
  if (isString(eventOrCommand) && eventOrCommand.startsWith('walker ')) {
    const result = elb(eventOrCommand, data as WalkerOS.Properties);
    return result;
  }

  // Handle event objects - add source and globals if missing
  if (isObject(eventOrCommand)) {
    const event = eventOrCommand;
    if (!event.source) event.source = getBrowserSource();

    // Add globals if not already present
    if (!event.globals) {
      event.globals = getGlobals(settings.prefix, settings.scope || document);
    }

    return elb(event);
  }

  // Extract entity name from event string
  const [entity] = String(
    isObject(eventOrCommand) ? eventOrCommand.name : eventOrCommand,
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

  // Check if contextData parameter is an element
  if (isElementOrDocument(pushContext)) {
    elemParameter = pushContext as Element;
  } else if (isObject(pushContext) && Object.keys(pushContext).length) {
    eventContext = pushContext as WalkerOS.OrderedProperties;
  }

  // Extract data from element if provided
  if (elemParameter) {
    const entityObj = getEntities(
      settings.prefix || 'data-elb',
      elemParameter,
    ).find((obj) => obj.entity === entity);
    if (entityObj) {
      if (dataIsElem) eventData = entityObj.data;
      eventContext = entityObj.context;
    }
  }

  // Special handling for page events
  if (entity === 'page') {
    eventData.id = eventData.id || window.location.pathname;
  }

  // Collect globals from the DOM scope
  const eventGlobals = getGlobals(settings.prefix, settings.scope);

  // Build unified event from various elb usage patterns
  const event: WalkerOS.DeepPartialEvent = {
    name: String(eventOrCommand || ''),
    data: eventData,
    context: eventContext,
    globals: eventGlobals,
    nested,
    custom,
    trigger: isString(options) ? options : '',
    timing: Math.round((performance.now() - startTime) / 10) / 100,
    source: getBrowserSource(),
  };

  return elb(event);
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
