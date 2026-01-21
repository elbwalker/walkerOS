import type { Transformer, WalkerOS } from '@walkeros/core';
import type { Types } from './types';

export * as TransformerDemo from './types';
export * as examples from './examples';

/**
 * Demo transformer for walkerOS
 *
 * Logs events using env.log (or console.log fallback) and passes them through.
 * Perfect for testing and demonstrations without external dependencies.
 *
 * Configuration options:
 * - name: Custom name for logging prefix (default: 'transformer-demo')
 * - fields: Array of dot-notation paths to log from the event (default: entire event)
 * - addProcessedFlag: If true, adds a 'processed' flag to the event data
 */
export const transformerDemo: Transformer.Init<Types> = (initContext) => {
  const { config, env } = initContext;
  const settings = {
    name: 'transformer-demo',
    ...config?.settings,
  };

  return {
    type: 'demo',
    config: { ...config, settings },

    init(context: Transformer.Context<Types>) {
      // eslint-disable-next-line no-console
      const log = env?.log || console.log;
      context.logger.debug('initialized');
      log(`[${settings.name}] initialized`);
    },

    push(
      event: WalkerOS.DeepPartialEvent,
      context: Transformer.Context<Types>,
    ) {
      // eslint-disable-next-line no-console
      const log = env?.log || console.log;

      const output = settings.fields
        ? extractValues(
            event as unknown as Record<string, unknown>,
            settings.fields,
          )
        : event;

      log(`[${settings.name}] ${JSON.stringify(output, null, 2)}`);
      context.logger.debug('processed event', {
        event: (event as { name?: string }).name,
      });

      // Optionally modify the event
      if (settings.addProcessedFlag) {
        return {
          ...event,
          data: {
            ...(event.data || {}),
            _processed: true,
            _processedBy: settings.name,
          },
        } as WalkerOS.DeepPartialEvent;
      }

      // Return void for passthrough (event unchanged)
      return;
    },
  };
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

export default transformerDemo;
