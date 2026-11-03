import type { WalkerOS, Source, Collector, Logger } from '@walkeros/core';
import {
  filterValues,
  isArray,
  isObject,
  isString,
  tryCatch,
} from '@walkeros/core';

// Global flag to prevent infinite loops
let isProcessing = false;

/**
 * DataLayer interceptor - handles dataLayer.push interception and event transformation
 */
export function interceptDataLayer(
  push: Collector.PushFn,
  config: Source.Config,
  logger: Logger.Instance,
  win: Record<string, unknown> = globalThis.window as unknown as Record<
    string,
    unknown
  >,
): void {
  const settings = config.settings as {
    name?: string;
    prefix?: string;
    filter?: (event: unknown) => boolean;
  };
  const dataLayerName = settings?.name || 'dataLayer';

  // Ensure dataLayer exists
  if (!win[dataLayerName]) {
    win[dataLayerName] = [];
  }

  const dataLayer = win[dataLayerName] as unknown[];
  if (!Array.isArray(dataLayer)) return;

  // Store original push
  const originalPush = dataLayer.push.bind(dataLayer);

  // Override push with event processing
  dataLayer.push = function (...args: unknown[]): number {
    // Prevent infinite loops
    if (isProcessing) {
      return originalPush(...args);
    }

    isProcessing = true;
    try {
      // Process each argument; one that fails skips only itself
      for (const arg of args) {
        processEvent(push, settings, arg, win, logger);
      }
    } finally {
      isProcessing = false;
    }

    // Call original push
    return originalPush(...args);
  };
}

/**
 * Process existing events on initialization
 */
export function processExistingEvents(
  push: Collector.PushFn,
  config: Source.Config,
  logger: Logger.Instance,
  limit?: number,
  win: Record<string, unknown> = globalThis.window as unknown as Record<
    string,
    unknown
  >,
): void {
  const settings = config.settings as {
    name?: string;
    prefix?: string;
    filter?: (event: unknown) => boolean;
  };
  const dataLayerName = settings?.name || 'dataLayer';
  const dataLayer = win[dataLayerName] as unknown[];

  if (!Array.isArray(dataLayer)) return;

  // Prevent loops during initialization
  if (isProcessing) return;

  isProcessing = true;
  try {
    const count = limit ?? dataLayer.length;
    for (let i = 0; i < count; i++) {
      processEvent(push, settings, dataLayer[i], win, logger);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single event - handles filtering, transformation, and WalkerOS event creation.
 * Never throws: the page's own push must not fail because of walkerOS.
 */
function processEvent(
  push: Collector.PushFn,
  settings: { prefix?: string; filter?: (event: unknown) => boolean } = {},
  rawEvent: unknown,
  win: Record<string, unknown>,
  logger: Logger.Instance,
): void {
  try {
    // Apply filter if provided
    const filter = settings.filter;
    if (filter) {
      const filterFn = tryCatch(
        () => filter(rawEvent),
        () => false, // If filter throws, don't skip the event
      );
      const filterResult = filterFn();
      if (filterResult === true) {
        return; // Skip filtered events
      }
    }

    // Only event values are copied: DOM elements, functions and cycles are
    // left out, a date becomes its timestamp.
    const transformedEvent = transformDataLayerEvent(filterValues(rawEvent));
    if (!transformedEvent) {
      return; // Skip invalid events
    }

    const prefix = settings.prefix || 'dataLayer';

    // Create partial WalkerOS event structure (collector will enrich it).
    // The source identity is stamped here: without it the collector falls back to
    // `type: 'collector'`, and destinations that echo events back into the
    // dataLayer lose the `source.type !== 'dataLayer'` guard against feedback loops.
    const partialEvent: WalkerOS.DeepPartialEvent = {
      name: `${prefix} ${transformedEvent.name}`,
      data: transformedEvent.data,
      source: { type: 'dataLayer', platform: 'web', ...getPageContext(win) },
    };

    // Push to collector
    push(partialEvent);
  } catch (error) {
    // A throwing log handler must not skip the page's own push either.
    tryCatch(() => logger.error('dataLayer push not processed', { error }))();
  }
}

/**
 * Page context like the browser source stamps it, read when the event is
 * emitted so SPA navigations are reflected. Fields without a readable value
 * are omitted, including when a getter throws, so the push itself never fails.
 */
function getPageContext(win: Record<string, unknown> | undefined): {
  url?: string;
  referrer?: string;
} {
  if (!win) return {};
  // Location and Document are host objects, which `isObject` rejects.
  const url = tryCatch((): string | undefined => {
    const location = win.location;
    return isObjectLike(location) &&
      'href' in location &&
      isString(location.href)
      ? location.href
      : undefined;
  })();
  const referrer = tryCatch((): string | undefined => {
    const doc = win.document;
    return isObjectLike(doc) && 'referrer' in doc && isString(doc.referrer)
      ? doc.referrer
      : undefined;
  })();
  return {
    ...(url !== undefined ? { url } : {}),
    ...(referrer !== undefined ? { referrer } : {}),
  };
}

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/** A dataLayer push as the collector receives it. */
interface DataLayerEvent {
  name: string;
  data: WalkerOS.Properties;
}

/**
 * Transform dataLayer events to standardized format
 * Handles: gtag arguments (an array once filtered), direct objects, existing events
 */
function transformDataLayerEvent(
  value: WalkerOS.Property | undefined,
): DataLayerEvent | null {
  // Handle direct object format: { event: 'test', data: 'value' }
  if (isObject(value)) {
    const { event, ...data } = value;
    return isString(event) ? { name: event, data } : null;
  }

  // Handle gtag argument format: ['consent', 'update', { ad_storage: 'granted' }]
  if (isArray(value) && value.length >= 2) {
    return transformGtagArgs(value);
  }

  return null;
}

/**
 * Transform gtag-style arguments to event object
 * ['consent', 'update', { ad_storage: 'granted' }] → { name: 'consent update', data: { ad_storage: 'granted' } }
 */
function transformGtagArgs(
  args: WalkerOS.PropertyType[],
): DataLayerEvent | null {
  const [command, action, params] = args;

  if (!isString(command)) return null;

  let eventName: string;
  let eventData: WalkerOS.Properties = {};

  switch (command) {
    case 'consent':
      // Consent requires action and params
      if (!isString(action) || args.length < 3) return null;
      // Only allow 'default' and 'update' actions for consent
      if (action !== 'default' && action !== 'update') return null;
      // Params must be a valid object
      if (!isObject(params)) return null;

      eventName = `${command} ${action}`;
      eventData = { ...params };
      break;

    case 'event':
      // Event requires at least action parameter
      if (!isString(action)) return null;
      eventName = action;
      if (isObject(params)) {
        eventData = { ...params };
      }
      break;

    case 'config':
      // Config requires at least action parameter
      if (!isString(action)) return null;
      eventName = `${command} ${action}`;
      if (isObject(params)) {
        eventData = { ...params };
      }
      break;

    case 'set':
      if (isString(action)) {
        eventName = `${command} ${action}`;
        if (isObject(params)) {
          eventData = { ...params };
        }
      } else if (isObject(action)) {
        eventName = `${command} custom`;
        eventData = { ...action };
      } else {
        return null;
      }
      break;

    default:
      // Unknown command, ignore
      return null;
  }

  return { name: eventName, data: eventData };
}
