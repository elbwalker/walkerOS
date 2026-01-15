import type { Collector, WalkerOS, Elb } from '@walkeros/core';
import {
  getGrantedConsent,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { createEvent } from './handle';
import { pushToDestinations, createPushResult } from './destination';
import { runTransformerChain } from './transformer';

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
      options: Collector.PushOptions = {},
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          const { id, ingest, mapping, preChain } = options;
          let partialEvent = event;

          // Freeze ingest for performance (pass by reference, no copying)
          const frozenIngest = ingest ? Object.freeze(ingest) : undefined;

          // Apply source mapping if provided in options
          if (mapping) {
            const processed = await processEventMapping(
              partialEvent,
              mapping,
              collector,
            );

            // Check ignore flag
            if (processed.ignore) {
              return createPushResult({ ok: true });
            }

            // Check consent requirements
            if (mapping.consent) {
              const grantedConsent = getGrantedConsent(
                mapping.consent,
                collector.consent,
                processed.event.consent as WalkerOS.Consent | undefined,
              );

              if (!grantedConsent) {
                return createPushResult({ ok: true });
              }
            }

            partialEvent = processed.event;
          }

          // Run pre-collector transformer chain if provided in options
          if (
            preChain?.length &&
            collector.transformers &&
            Object.keys(collector.transformers).length > 0
          ) {
            const processedEvent = await runTransformerChain(
              collector,
              collector.transformers,
              preChain,
              partialEvent,
              frozenIngest,
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

          // Push to destinations with id and ingest
          return await pushToDestinations(collector, fullEvent, {
            id,
            ingest: frozenIngest,
          });
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
