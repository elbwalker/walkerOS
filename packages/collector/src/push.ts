import type { Collector, WalkerOS, Elb, Ingest } from '@walkeros/core';
import {
  createIngest,
  emitStep,
  FatalError,
  getGrantedConsent,
  getSpanId,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { createEvent, enrichEvent } from './handle';
import { pushToDestinations, createPushResult } from './destination';
import { buildBaseState, journeyFields } from './observerEmit';
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
  const innerPush = useHooks(
    async (
      event: WalkerOS.DeepPartialEvent,
      options: Collector.PushOptions = {},
    ): Promise<Elb.PushResult> => {
      return await tryCatchAsync(
        async (): Promise<Elb.PushResult> => {
          const pushStart = Date.now();
          const {
            id,
            ingest,
            respond: initialRespond,
            mapping,
            preChain,
            include,
            exclude,
          } = options;
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
              collector.logger.debug(
                `Event dropped by transformer chain${
                  chainResult.droppedBy ? ` (${chainResult.droppedBy})` : ''
                }`,
              );
              return createPushResult({ ok: true, dropped: true });
            }

            // Pipeline-halt signal from a pre-collector `cache.stop: true`
            // HIT. The event is intentionally NOT forwarded to destinations;
            // duplicates are suppressed at the source.next boundary per the
            // documented "downstream transformers and destinations are
            // skipped" semantic in transformers/cache.mdx.
            if (chainResult.stopped) {
              if (chainResult.respond) respond = chainResult.respond;
              return createPushResult({ ok: true });
            }

            // Update respond if the chain produced a wrapped one
            if (chainResult.respond) respond = chainResult.respond;

            // The id the chain ran under, and therefore the id the records
            // emitted before it carry. A fork that spreads its input copies
            // this id onto every child; a rebuilt single result drops it.
            // Both are corrected below. The invariant this establishes is
            // narrow and deliberate: no child keeps the CHAIN INPUT's id. It
            // is NOT "no two children share an id". Children spreading an id
            // a transformer assigned mid-chain still collapse, because that id
            // was chosen rather than inherited and is indistinguishable here.
            const chainEventId =
              typeof partialEvent.id === 'string' ? partialEvent.id : '';

            // Handle fan-out: array means multiple events from a single input
            if (Array.isArray(chainResult.event)) {
              // Process each forked event through the rest of the pipeline
              const forkResults = await Promise.all(
                chainResult.event.map(async (forkEvent) => {
                  // A child that inherited the chain input's id is a distinct
                  // event and gets its own span. A child carrying an id the
                  // transformer chose keeps it; one with no id is minted by
                  // `createEvent` below.
                  const forked =
                    chainEventId !== '' && forkEvent.id === chainEventId
                      ? { ...forkEvent, id: getSpanId() }
                      : forkEvent;
                  const enriched = prepareEvent(forked);
                  const full = createEvent(collector, enriched, pipelineIngest);
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

            // One result is the same logical event the chain received, so it
            // keeps that id even when the transformer rebuilt the event from
            // scratch. Without this the wrap's in/out pair and everything the
            // rebuilt event goes on to emit land in two different journeys.
            partialEvent =
              chainEventId !== '' &&
              !(
                typeof chainResult.event.id === 'string' &&
                chainResult.event.id !== ''
              )
                ? { ...chainResult.event, id: chainEventId }
                : chainResult.event;
          }

          // Enrich into a full event (timing, source info, defaults)
          const fullEvent = enrichEvent(
            collector,
            partialEvent,
            pipelineIngest,
          );

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
        (err: unknown) => {
          if (err instanceof FatalError) throw err;
          collector.status.failed++;
          collector.logger.error('push failed', {
            event,
            ingest: options.ingest,
            error: err,
          });
          return createPushResult({ ok: false });
        },
      )();
    },
    'Push',
    collector.hooks,
    collector.logger,
  );

  const wrapped: Collector.PushFn = async (event, options) => {
    // Mint the event's span id HERE when absent, so every record of this
    // event carries it, the wrap's own in record included. This is the id the
    // identified event carries into `createEvent`, which preserves a supplied
    // id (handle.ts). The copy never mutates the caller's object.
    const identified =
      typeof event.id === 'string' && event.id !== ''
        ? event
        : { ...event, id: getSpanId() };
    const eventId = typeof identified.id === 'string' ? identified.id : '';
    // Journey correlation from what is in scope at the wrap boundary: the
    // incoming event's trace, then the header-derived ingest trace, then the
    // run trace, plus the source context threaded through `options.ingest`.
    // The processed full event is not visible here, so out/error reuse the
    // same incoming-event trace (identical value in the common case).
    const { traceId, sourceId, parentEventId } = journeyFields(
      identified,
      options?.ingest,
      collector,
    );
    const started = Date.now();
    const inState = buildBaseState(collector, {
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      eventId,
      now: started,
      traceId,
      sourceId,
      parentEventId,
    });
    inState.inEvent = identified;
    emitStep(collector, inState);

    try {
      const result = await innerPush(identified, options);
      const finished = Date.now();
      const outState = buildBaseState(collector, {
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        // The same id as the in record. Reading it off the result instead
        // would split the wrap's own pair across two journeys whenever the
        // result reports a different event: a fan-out reporting its first
        // child, or a `prePush` hook that swapped the event.
        eventId,
        now: finished,
        traceId,
        sourceId,
        parentEventId,
      });
      outState.durationMs = finished - started;
      outState.outEvent = result;
      emitStep(collector, outState);
      return result;
    } catch (err) {
      const finished = Date.now();
      const errState = buildBaseState(collector, {
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'error',
        eventId,
        now: finished,
        traceId,
        sourceId,
        parentEventId,
      });
      errState.durationMs = finished - started;
      errState.error =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      emitStep(collector, errState);
      throw err;
    }
  };

  return wrapped;
}
