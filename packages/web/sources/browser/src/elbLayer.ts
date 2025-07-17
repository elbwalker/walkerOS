import type { WalkerOS } from '@walkerOS/core';
import type { ELBLayer, ELBLayerConfig } from './types';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
} from './types/elb';
import { tryCatch } from '@walkerOS/core';
import { translateToCoreCollector } from './translation';

/**
 * Initialize ELB Layer for async command handling
 * This creates window.elbLayer array and processes any existing commands
 */
export function initElbLayer(
  collector: WalkerOS.Collector,
  config: ELBLayerConfig = {},
): void {
  const layerName = config.name || 'elbLayer';

  // Ensure elbLayer exists on window
  if (!window[layerName]) {
    window[layerName] = [];
  }

  const elbLayer = window[layerName] as ELBLayer;

  // Process any existing commands that were pushed before initialization
  if (Array.isArray(elbLayer) && elbLayer.length > 0) {
    processELBLayerCommands(collector, elbLayer);
  }
}

/**
 * Process commands from ELB Layer array
 * Commands are processed in order with walker commands getting priority
 */
function processELBLayerCommands(
  collector: WalkerOS.Collector,
  elbLayer: ELBLayer,
): void {
  // Separate walker commands from regular events for priority processing
  const walkerCommands: unknown[] = [];
  const regularEvents: unknown[] = [];

  // Sort commands by priority (walker commands first)
  elbLayer.forEach((command) => {
    if (isWalkerCommand(command)) {
      walkerCommands.push(command);
    } else {
      regularEvents.push(command);
    }
  });

  // Process walker commands first
  walkerCommands.forEach((command) => {
    processCommand(collector, command);
  });

  // Then process regular events
  regularEvents.forEach((command) => {
    processCommand(collector, command);
  });

  // Clear the array after processing
  elbLayer.length = 0;
}

/**
 * Process a single command from ELB Layer
 */
function processCommand(collector: WalkerOS.Collector, command: unknown): void {
  // Skip malformed commands entirely
  if (
    command === null ||
    command === undefined ||
    command === '' ||
    typeof command === 'number' ||
    typeof command === 'string'
  ) {
    return;
  }

  tryCatch(
    () => {
      if (isArrayLike(command)) {
        // Handle array-like commands: [action, data, options, context]
        const args = Array.from(command as ArrayLike<unknown>);

        if (args.length >= 1) {
          const [action, data, options, context] = args;

          if (typeof action === 'string' && action.length > 0) {
            // Use translation layer to convert to core collector format
            translateToCoreCollector(
              collector,
              action,
              data as BrowserPushData,
              options as BrowserPushOptions,
              context as BrowserPushContext,
            );
          }
        }
      } else if (typeof command === 'object' && command !== null) {
        // Skip empty objects unless they have properties
        if (Object.keys(command).length === 0) {
          return;
        }
        // Handle object commands directly through translation
        translateToCoreCollector(collector, command);
      }
    },
    () => {
      // Silent error handling - failed commands are ignored
    },
  )();
}

/**
 * Check if a command is a walker command (starts with 'walker ')
 */
function isWalkerCommand(command: unknown): boolean {
  if (isArrayLike(command)) {
    const args = Array.from(command as ArrayLike<unknown>);
    return typeof args[0] === 'string' && args[0].startsWith('walker ');
  }
  return false;
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
