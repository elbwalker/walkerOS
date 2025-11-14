import type { Destination } from '@walkeros/core';
import type { WalkerOS } from '@walkeros/core';

/**
 * Console destination settings
 */
export interface ConsoleDestinationSettings {
  pretty?: boolean;
  prefix?: string;
  includeContext?: boolean;
}

/**
 * Console destination for testing and debugging
 *
 * Logs events to console with optional formatting
 */
export const destinationConsole: Destination.Instance = {
  type: 'console',

  config: {
    settings: {
      pretty: true,
      prefix: '[walkerOS]',
      includeContext: false,
    } as ConsoleDestinationSettings,
  },

  /**
   * Process and log event to console
   */
  push: async (event: WalkerOS.Event, context?: Destination.PushContext) => {
    const settings = (context?.config?.settings || {
      pretty: true,
      prefix: '[walkerOS]',
      includeContext: false,
    }) as ConsoleDestinationSettings;

    const prefix = settings.prefix || '[walkerOS]';

    if (settings.pretty) {
      // Pretty formatted output
      console.log(`\n${prefix} Event:`, event.name);
      console.log(`  Entity: ${event.entity}`);
      console.log(`  Action: ${event.action}`);

      if (event.data && Object.keys(event.data).length > 0) {
        console.log('  Data:', JSON.stringify(event.data, null, 2));
      }

      if (event.globals && Object.keys(event.globals).length > 0) {
        console.log('  Globals:', JSON.stringify(event.globals, null, 2));
      }

      if (event.user) {
        console.log('  User:', JSON.stringify(event.user, null, 2));
      }

      if (event.context && Object.keys(event.context).length > 0) {
        console.log('  Context:', JSON.stringify(event.context, null, 2));
      }

      if (settings.includeContext && context) {
        console.log('  Push Context:', JSON.stringify(context, null, 2));
      }

      console.log(`  Timestamp: ${event.timestamp}`);
      console.log(`  ID: ${event.id}`);
    } else {
      // Compact JSON output
      const output: Record<string, unknown> = {
        event: event.name,
        entity: event.entity,
        action: event.action,
        data: event.data,
        timestamp: event.timestamp,
        id: event.id,
      };

      if (settings.includeContext && context) {
        output.context = context;
      }

      console.log(`${prefix}`, JSON.stringify(output));
    }
  },
};

/**
 * Create console destination with custom settings
 */
export function createConsoleDestination(
  settings: ConsoleDestinationSettings,
): Destination.Instance {
  return {
    ...destinationConsole,
    config: {
      settings: {
        ...(destinationConsole.config.settings as ConsoleDestinationSettings),
        ...settings,
      } as ConsoleDestinationSettings,
    },
  };
}
