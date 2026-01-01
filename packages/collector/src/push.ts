import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import {
  getGrantedConsent,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { createEvent } from './handle';
import { pushToDestinations, createPushResult } from './destination';
import { runProcessorChain } from './processor';

/**
 * Creates the push function for the collector.
 * Handles source mapping, event creation, and routing to destinations.
 *
 * @param collector - The walkerOS collector instance
 * @param prepareEvent - Function to enrich partial events
 * @returns The push function
 */
export function createPush<T extends Collector.Instance>(
  collector: T,
  prepareEvent: (event: WalkerOS.DeepPartialEvent) => WalkerOS.PartialEvent,
): Collector.PushFn {
  return useHooks(
    async (
      event: WalkerOS.DeepPartialEvent,
      context: Collector.PushContext = {},
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          let partialEvent = event;

          // Apply source mapping if provided in context
          if (context.mapping) {
            const processed = await processEventMapping(
              partialEvent,
              context.mapping,
              collector,
            );

            // Check ignore flag
            if (processed.ignore) {
              return createPushResult({ ok: true });
            }

            // Check consent requirements
            if (context.mapping.consent) {
              const grantedConsent = getGrantedConsent(
                context.mapping.consent,
                collector.consent,
                processed.event.consent as WalkerOS.Consent | undefined,
              );

              if (!grantedConsent) {
                return createPushResult({ ok: true });
              }
            }

            partialEvent = processed.event;
          }

          // Run pre-collector processor chain if configured
          if (
            collector.processorChain?.pre?.length > 0 &&
            collector.processors &&
            Object.keys(collector.processors).length > 0
          ) {
            const processedEvent = await runProcessorChain(
              collector,
              collector.processors,
              collector.processorChain.pre,
              partialEvent,
            );

            // Chain was stopped - event dropped
            if (processedEvent === null) {
              return createPushResult({ ok: true });
            }

            partialEvent = processedEvent;
          }

          // Prepare event (add timing, source info)
          const enrichedEvent = prepareEvent(partialEvent);

          // Create full event
          const fullEvent = createEvent(collector, enrichedEvent);

          // Push to destinations
          return await pushToDestinations(collector, fullEvent);
        },
        () => {
          return createPushResult({ ok: false });
        },
      )();
    },
    'Push',
    collector.hooks,
  ) as Collector.PushFn;
}
