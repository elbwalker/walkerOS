import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';

/**
 * Batch every event with config.batch (no mapping rule needed)
 *
 * Setting config.batch on a destination batches ALL of its events into one
 * shared buffer. There is no need for a `mapping: { '*': { '*': { batch } } }`
 * wildcard rule. The buffer flushes after `wait` milliseconds of quiet or once
 * it reaches `size` events, whichever comes first. A rule-level `batch` still
 * splits that entity-action into its own buffer and overrides per field.
 */
export async function setupBatchAll(): Promise<{
  collector: unknown;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await startFlow({
    destinations: {
      // API destination batches every event with no per-rule mapping
      api: {
        code: destinationAPI,
        config: {
          settings: {
            url: 'https://analytics.example.com/events',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          // Enables batch-all: one shared buffer for every event,
          // flushed after 1s of quiet or once 50 events accumulate.
          batch: {
            wait: 1000,
            size: 50,
          },
        },
        env: {
          // Mock sendWeb function
          sendWeb: (url: unknown, body: unknown, options: unknown) => {
            console.log('API batch:', { url, body, options });
          },
        },
      },
    },
  });

  return { collector, elb };
}

export default setupBatchAll;
