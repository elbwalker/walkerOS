import type { WalkerOS, Source, Collector } from '@walkeros/core';
import { isArray, isObject, isString, tryCatch } from '@walkeros/core';

// Global flag to prevent infinite loops
let isProcessing = false;

/**
 * DataLayer interceptor - handles dataLayer.push interception and event transformation
 */
export function interceptDataLayer(
  push: Collector.PushFn,
  config: Source.Config,
): void {
  const settings = config.settings as {
    name?: string;
    prefix?: string;
    filter?: (event: unknown) => boolean;
  };
  const dataLayerName = settings?.name || 'dataLayer';

  // Ensure dataLayer exists
  if (!window[dataLayerName]) {
    window[dataLayerName] = [];
  }

  const dataLayer = window[dataLayerName] as unknown[];
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
      // Process each argument
      for (const arg of args) {
        processEvent(push, settings, arg);
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
  limit?: number,
): void {
  const settings = config.settings as {
    name?: string;
    prefix?: string;
    filter?: (event: unknown) => boolean;
  };
  const dataLayerName = settings?.name || 'dataLayer';
  const dataLayer = window[dataLayerName] as unknown[];

  if (!Array.isArray(dataLayer)) return;

  // Prevent loops during initialization
  if (isProcessing) return;

  isProcessing = true;
  try {
    const count = limit ?? dataLayer.length;
    for (let i = 0; i < count; i++) {
      processEvent(push, settings, dataLayer[i]);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single event - handles filtering, transformation, and WalkerOS event creation
 */
function processEvent(
  push: Collector.PushFn,
  settings: { prefix?: string; filter?: (event: unknown) => boolean } = {},
  rawEvent: unknown,
): void {
  // Apply filter if provided
  if (settings.filter) {
    const filterFn = tryCatch(
      () => settings.filter!(rawEvent),
      () => false, // If filter throws, don't skip the event
    );
    const filterResult = filterFn();
    if (filterResult === true) {
      return; // Skip filtered events
    }
  }

  // Transform the event (handles gtag format and direct objects)
  const transformedEvent = transformDataLayerEvent(rawEvent);
  if (!transformedEvent) {
    return; // Skip invalid events
  }

  const prefix = settings.prefix || 'dataLayer';
  const eventName = `${prefix} ${transformedEvent.name}`;

  // Create partial WalkerOS event structure (collector will enrich it)
  const { name: _name, ...data } = transformedEvent;
  const partialEvent: WalkerOS.DeepPartialEvent = {
    name: eventName,
    data: data as WalkerOS.Properties,
  };

  // Push to collector
  tryCatch(
    () => push(partialEvent),
    () => {}, // Silently handle push errors
  )();
}

/**
 * Transform dataLayer events to standardized format
 * Handles: gtag arguments, direct objects, existing events
 */
function transformDataLayerEvent(
  rawEvent: unknown,
): { name: string; [key: string]: unknown } | null {
  // Handle direct object format: { event: 'test', data: 'value' }
  if (isObject(rawEvent) && isString(rawEvent.event)) {
    const { event, ...rest } = rawEvent;
    return { name: event, ...rest };
  }

  // Handle gtag argument format: ['consent', 'update', { ad_storage: 'granted' }]
  if (isArray(rawEvent) && rawEvent.length >= 2) {
    return transformGtagArgs(rawEvent);
  }

  // Handle arguments object (from gtag function calls)
  if (isGtagArguments(rawEvent)) {
    const argsArray = Array.from(rawEvent as ArrayLike<unknown>);
    return transformGtagArgs(argsArray);
  }

  return null;
}

/**
 * Transform gtag-style arguments to event object
 * ['consent', 'update', { ad_storage: 'granted' }] → { event: 'consent update', ad_storage: 'granted' }
 */
function transformGtagArgs(
  args: unknown[],
): { name: string; [key: string]: unknown } | null {
  const [command, action, params] = args;

  if (!isString(command)) return null;

  let eventName: string;
  let eventData: Record<string, unknown> = {};

  switch (command) {
    case 'consent':
      // Consent requires action and params
      if (!isString(action) || args.length < 3) return null;
      // Only allow 'default' and 'update' actions for consent
      if (action !== 'default' && action !== 'update') return null;
      // Params must be a valid object (not null)
      if (!isObject(params) || params === null) return null;

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

  return {
    name: eventName,
    ...eventData,
  };
}

/**
 * Check if object is gtag arguments object
 */
function isGtagArguments(obj: unknown): boolean {
  return (
    obj != null &&
    typeof obj === 'object' &&
    'length' in obj &&
    typeof (obj as ArrayLike<unknown>).length === 'number' &&
    (obj as ArrayLike<unknown>).length > 0
  );
}
