import type { Collector, Source, WalkerOS, Elb } from '@walkeros/core';
import { createPushResult } from './destination';

/**
 * Creates the default ELB source.
 * Routes between collector.push and collector.command based on input.
 * Provides backward-compatible flexible argument interface.
 *
 * @param collector - The walkerOS collector instance
 * @returns ELB source instance
 */
export function createElbSource(
  collector: Collector.Instance,
): Source.Instance {
  return {
    type: 'elb',
    config: {},

    // The push function is the elb() interface users interact with
    push: async (
      eventOrCommand?: unknown,
      data?: unknown,
      options?: unknown,
      context?: unknown,
      nested?: WalkerOS.Entities,
      custom?: WalkerOS.Properties,
    ): Promise<Elb.PushResult> => {
      // Detect walker commands
      if (
        typeof eventOrCommand === 'string' &&
        eventOrCommand.startsWith('walker ')
      ) {
        const command = eventOrCommand.replace('walker ', '');
        return collector.command(command, data, options);
      }

      // Build event object
      let event: WalkerOS.DeepPartialEvent;

      if (typeof eventOrCommand === 'string') {
        // Convert string to object: elb('page view', { title: 'Home' })
        event = { name: eventOrCommand };
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          event.data = data as WalkerOS.Properties;
        }
      } else if (eventOrCommand && typeof eventOrCommand === 'object') {
        // Use object directly: elb({ name: 'page view', data: {...} })
        event = eventOrCommand as WalkerOS.DeepPartialEvent;
        // Merge additional data if provided
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          event.data = {
            ...(event.data || {}),
            ...(data as WalkerOS.Properties),
          };
        }
      } else {
        // Invalid input
        return createPushResult({ ok: false });
      }

      // Add optional properties if provided
      if (context && typeof context === 'object') {
        event.context = context as WalkerOS.OrderedProperties;
      }
      if (nested && Array.isArray(nested)) {
        event.nested = nested;
      }
      if (custom && typeof custom === 'object') {
        event.custom = custom as WalkerOS.Properties;
      }

      // Call collector.push with event object
      return collector.push(event);
    },
  };
}
