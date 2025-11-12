import type { WalkerOS } from '@walkeros/core';
import type { Destination } from './types';

export * as DestinationDemo from './types';

/**
 * Demo destination for walkerOS
 *
 * Logs events using env.log (or console.log fallback) with optional field filtering.
 * Perfect for testing and demonstrations without external dependencies.
 */
export const destinationDemo: Destination = {
  type: 'demo',

  config: {
    settings: {
      name: 'demo',
    },
  },

  init({ config, env }) {
    // eslint-disable-next-line no-console
    const log = env?.log || console.log;
    const settings = config?.settings || { name: 'demo' };

    // Log initialization
    log(`[${settings.name}] initialized`);
  },

  push(event, { config, env }) {
    // eslint-disable-next-line no-console
    const log = env?.log || console.log;
    const settings = config?.settings || { name: 'demo' };

    const output = settings.values
      ? extractValues(
          event as unknown as Record<string, unknown>,
          settings.values,
        )
      : event;

    log(`[${settings.name}] ${JSON.stringify(output, null, 2)}`);
  },
};

/**
 * Extract values from object using dot notation paths
 */
function extractValues(
  obj: Record<string, unknown>,
  paths: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const path of paths) {
    const value = path
      .split('.')
      .reduce<unknown>(
        (acc, key) => (acc as Record<string, unknown>)?.[key],
        obj,
      );
    if (value !== undefined) {
      result[path] = value;
    }
  }

  return result;
}

export default destinationDemo;
