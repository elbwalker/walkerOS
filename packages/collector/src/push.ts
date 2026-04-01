import type { Collector, WalkerOS, Elb, Ingest } from '@walkeros/core';
import {
  createIngest,
  getGrantedConsent,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { createEvent } from './handle';
import { pushToDestinations, createPushResult } from './destination';
import { runTransformerChain } from './transformer';

function filterDestinations(
  destinations: Collector.Destinations,
  include?: string[],
  exclude?: string[],
): Collector.Destinations {
  let filtered = destinations;
  if (include) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([id]) => include.includes(id)),
    );
  }
  if (exclude) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([id]) => !exclude.includes(id)),
    );
  }
  return filtered;
}

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
          const pushStart = Date.now();
          const { id, ingest, respond: initialRespond, mapping, preChain, include, exclude } =
            options;
          let respond = initialRespond;
          let partialEvent = event;

          // Build filtered destination set if include/exclude specified
          const filteredDests =
            include || exclude
              ? filterDestinations(collector.destinations, include, exclude)
              : undefined;

          // Create mutable Ingest — accumulates context through the pipeline
          const pipelineIngest: Ingest =
            (ingest as Ingest | undefined) ?? createIngest(id || 'unknown');

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
            const chainResult = await runTransformerChain(
              collector,
              collector.transformers,
              preChain,
              partialEvent,
              pipelineIngest,
              respond,
              id ? `source.${id}.next` : undefined,
            );

            // Chain was stopped - event dropped
            if (chainResult.event === null) {
              return createPushResult({ ok: true });
            }

            // Update respond if the chain produced a wrapped one
            if (chainResult.respond) respond = chainResult.respond;

            // Handle fan-out: array means multiple events from a single input
            if (Array.isArray(chainResult.event)) {
              // Process each forked event through the rest of the pipeline
              const forkResults = await Promise.all(
                chainResult.event.map(async (forkEvent) => {
                  const enriched = prepareEvent(forkEvent);
                  const full = createEvent(collector, enriched);
                  return pushToDestinations(
                    collector,
                    full,
                    {
                      id,
                      ingest: pipelineIngest,
                      respond,
                    },
                    filteredDests,
                  );
                }),
              );

              // Update source status
              if (id) {
                if (!collector.status.sources[id]) {
                  collector.status.sources[id] = {
                    count: 0,
                    duration: 0,
                  };
                }
                const sourceStatus = collector.status.sources[id];
                sourceStatus.count += chainResult.event.length;
                sourceStatus.lastAt = Date.now();
                sourceStatus.duration += Date.now() - pushStart;
              }

              return forkResults[0] ?? createPushResult({ ok: true });
            }

            partialEvent = chainResult.event;
          }

          // Prepare event (add timing, source info)
          const enrichedEvent = prepareEvent(partialEvent);

          // Create full event
          const fullEvent = createEvent(collector, enrichedEvent);

          // Push to destinations with id and ingest
          const result = await pushToDestinations(
            collector,
            fullEvent,
            {
              id,
              ingest: pipelineIngest,
              respond,
            },
            filteredDests,
          );

          // Update source status
          if (id) {
            if (!collector.status.sources[id]) {
              collector.status.sources[id] = {
                count: 0,
                duration: 0,
              };
            }
            const sourceStatus = collector.status.sources[id];
            sourceStatus.count++;
            sourceStatus.lastAt = Date.now();
            sourceStatus.duration += Date.now() - pushStart;
          }

          return result;
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
