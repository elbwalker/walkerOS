import type { WalkerOS, Collector, Elb } from '@walkeros/core';
import type { ELBLayer, ELBLayerConfig, Settings } from './types';
import { tryCatch, isString, isObject } from '@walkeros/core';
import { translateToCoreCollector } from './translation';

/**
 * Initialize elbLayer for async command handling
 * This creates window.elbLayer array and processes any existing commands
 */
export function initElbLayer(
  elb: Elb.Fn,
  config: ELBLayerConfig & { prefix?: string; window?: Window } = {},
): void {
  const layerName = config.name || 'elbLayer';
  const windowObj =
    config.window || (typeof window !== 'undefined' ? window : undefined);

  if (!windowObj) {
    return; // Skip if no window available
  }

  // Ensure elbLayer exists on window
  if (!windowObj[layerName]) {
    windowObj[layerName] = [];
  }

  const elbLayer = windowObj[layerName] as ELBLayer;

  // Override the push method to process items immediately
  elbLayer.push = function (...args: Array<Elb.Layer | IArguments>) {
    // Handle arguments object
    if (isArguments(args[0])) {
      const argsArray = [...Array.from(args[0])];
      const i = Array.prototype.push.apply(this, [argsArray]);
      // Process the arguments as a single command
      pushCommand(elb, config.prefix, argsArray);
      return i;
    }

    const i = Array.prototype.push.apply(this, args);

    // Process each pushed item immediately
    args.forEach((item) => {
      pushCommand(elb, config.prefix, item);
    });

    return i;
  };

  // Process any existing commands that were pushed before initialization
  if (Array.isArray(elbLayer) && elbLayer.length > 0) {
    processElbLayer(elb, config.prefix, elbLayer);
  }
}

/**
 * Process commands from ELB Layer array
 * Commands are processed in order with walker commands getting priority
 */
function processElbLayer(
  elb: Elb.Fn,
  prefix: string = 'data-elb',
  elbLayer: ELBLayer,
): void {
  // Process in two phases: walker commands first, then events
  processPredefined(elb, prefix, elbLayer, true); // Commands only
  processPredefined(elb, prefix, elbLayer, false); // Events only

  // Clear the array after processing
  elbLayer.length = 0;
}

/**
 * Process predefined commands with execution order handling
 */
function processPredefined(
  elb: Elb.Fn,
  prefix: string,
  elbLayer: ELBLayer,
  commandsOnly: boolean,
): void {
  const walkerCommand = 'walker '; // Space on purpose
  const events: unknown[] = [];
  let isFirstRunEvent = true;

  elbLayer.forEach((pushedItem) => {
    // Handle arguments object or arrays
    const item = isArguments(pushedItem)
      ? [...Array.from(pushedItem)]
      : isArrayLike(pushedItem)
        ? Array.from(pushedItem as ArrayLike<unknown>)
        : [pushedItem];

    // Skip malformed commands
    if (Array.isArray(item) && item.length === 0) {
      return; // Empty array
    }

    if (Array.isArray(item) && item.length === 1 && !item[0]) {
      return; // Array with falsy first element
    }

    const firstParam = item[0];
    const isCommand =
      !isObject(firstParam) &&
      isString(firstParam) &&
      firstParam.startsWith(walkerCommand);

    if (!isObject(firstParam)) {
      const args = Array.from(item);
      if (!isString(args[0]) || args[0].trim() === '') return; // Invalid or empty string

      // FIXED: Don't skip the first walker run - this was causing no events on first load
      // The original logic was meant to prevent duplicate execution but was too aggressive
      const runCommand = 'walker run';
      if (isFirstRunEvent && args[0] === runCommand) {
        isFirstRunEvent = false; // Mark that we've seen the first run
        // Continue processing instead of returning
      }
    } else {
      // For objects, skip if empty
      if (
        typeof firstParam === 'object' &&
        Object.keys(firstParam).length === 0
      ) {
        return;
      }
    }

    // Handle commands and events separately
    if (
      (commandsOnly && isCommand) || // Only commands
      (!commandsOnly && !isCommand) // Only events
    )
      events.push(item);
  });

  events.forEach((item) => {
    // Use the elb push function directly to match legacy behavior
    pushCommand(elb, prefix, item);
  });
}

/**
 * Push command directly using elb or translation based on type
 */
function pushCommand(
  elb: Elb.Fn,
  prefix: string = 'data-elb',
  item: unknown,
): void {
  tryCatch(
    () => {
      if (Array.isArray(item)) {
        const [action, ...rest] = item;

        // Skip empty or invalid actions
        if (!action || (isString(action) && action.trim() === '')) {
          return;
        }

        // Walker commands go directly to collector
        if (isString(action) && action.startsWith('walker ')) {
          elb(action, rest[0]);
          return;
        }

        // Regular events go through translation
        translateToCoreCollector(
          {
            elb,
            settings: {
              prefix,
              scope: document,
              pageview: false,
              session: false,
              elb: '',
              elbLayer: false,
            },
          },
          action,
          ...rest,
        );
      } else if (item && typeof item === 'object') {
        // Skip empty objects
        if (Object.keys(item).length === 0) {
          return;
        }
        // Object events go directly to elb
        elb(item as WalkerOS.DeepPartialEvent);
      }
    },
    () => {
      // Silent error handling - failed commands are ignored
    },
  )();
}

/**
 * Check if value is arguments object
 */
function isArguments(value: unknown): value is IArguments {
  return (
    value != null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Arguments]'
  );
}

/**
 * Check if value is array-like (has length property)
 */
function isArrayLike(value: unknown): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    'length' in value &&
    typeof (value as unknown[]).length === 'number'
  );
}
