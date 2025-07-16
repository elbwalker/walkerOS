import type { WalkerOS } from '@walkerOS/core';
import { isArray, isObject, isString, tryCatch } from '@walkerOS/core';

// Global flag to prevent infinite loops
let isProcessing = false;

/**
 * DataLayer interceptor - handles dataLayer.push interception and event transformation
 */
export function interceptDataLayer(
  collector: WalkerOS.Collector,
  config: WalkerOS.CollectorSourceConfig,
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
        processEvent(collector, settings, arg);
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
  collector: WalkerOS.Collector,
  config: WalkerOS.CollectorSourceConfig,
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
    // Process all existing events
    for (const event of dataLayer) {
      processEvent(collector, settings, event);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single event - handles filtering, transformation, and WalkerOS event creation
 */
function processEvent(
  collector: WalkerOS.Collector,
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
  const eventName = `${prefix} ${transformedEvent.event}`;

  // Create WalkerOS event structure
  const walkerEvent: WalkerOS.Event = {
    event: eventName,
    data: transformedEvent as WalkerOS.Properties,
    context: {},
    globals: {},
    custom: {},
    consent: {},
    nested: [],
    user: {},
    id: generateId(),
    trigger: '',
    entity: '',
    action: '',
    timestamp: Date.now(),
    timing: 0,
    group: '',
    count: 0,
    version: { source: '1.0.0', tagging: 2 },
    source: {
      type: 'dataLayer',
      id: '',
      previous_id: '',
    },
  };

  // Push to collector
  tryCatch(
    () => collector.push(walkerEvent),
    () => {}, // Silently handle push errors
  )();
}

/**
 * Transform dataLayer events to standardized format
 * Handles: gtag arguments, direct objects, existing events
 */
function transformDataLayerEvent(
  rawEvent: unknown,
): { event: string; [key: string]: unknown } | null {
  // Handle direct object format: { event: 'test', data: 'value' }
  if (isObject(rawEvent) && isString(rawEvent.event)) {
    return rawEvent as { event: string; [key: string]: unknown };
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
): { event: string; [key: string]: unknown } | null {
  const [command, action, params] = args;

  if (!isString(command)) return null;

  let eventName: string;
  let eventData: Record<string, unknown> = {};

  switch (command) {
    case 'consent':
      // Consent requires action and params
      if (!isString(action) || args.length < 3) return null;
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
    event: eventName,
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

/**
 * Generate simple ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
