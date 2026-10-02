import type { Collector, WalkerOS, Elb, Ingest } from '@walkeros/core';
import {
  createIngest,
  emitStep,
  FatalError,
  getGrantedConsent,
  getSpanId,
  InvalidEventError,
  processEventMapping,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { pushBounded, resetOverflowFlag, warnOverflowOnce } from './buffers';
import { bumpDropped, errorMeta } from './report-error';
import { createEvent, enrichEvent } from './handle';
import { pushToDestinations, createPushResult } from './destination';
import {
  buildBaseState,
  emitCollectorDrop,
  journeyFields,
} from './observerEmit';
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
          // Dormant hold: an event born before run is held raw and replayed
          // by runCollector, so the pipeline (mapping, chains, enrichment)
          // runs exactly once, with post-run state. See prerun-hold.test.ts.
          if (!collector.allowed) {
            const max = collector.config.queueMax;
            if (max === undefined) {
              throw new Error(
                'Collector.Config.queueMax is undefined; defaults must be seeded by collector()',
              );
            }
            const held = pushBounded(
              collector.preRunQueue,
              { event, options },
              { max },
            );
            if (held.dropped > 0) {
              // Counted under its own step id, NOT `stepId('collector')`: that
              // one's `queue` counter is the post-run replay buffer, and
              // pre-run loss is a different problem with a different fix, so
              // the two stay separately diagnosable.
              const droppedCount = bumpDropped(
                collector.status,
                'collector.preRun',
                'queue',
                held.dropped,
              );
              warnOverflowOnce(
                collector.preRunQueue,
                collector.logger,
                'collector.preRunQueue overflow; oldest events dropped',
                { buffer: 'queue', cap: max, droppedCount },
              );
            } else if (collector.preRunQueue.length < max) {
              resetOverflowFlag(collector.preRunQueue);
            }
            collector.logger.debug('event held until run', {
              name: event.name,
              dropped: held.dropped,
            });
            return createPushResult({ ok: true });
          }

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
          let pipelineIngest: Ingest =
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

          // Run the pre-collector chain (the source's `next` route). It
          // resolves hop by hop with `{ ingest, event }`, after the source's
          // mapping and state.
          if (preChain !== undefined) {
            const chainPath = id ? `source.${id}.next` : undefined;
            const chainResult = await runTransformerChain(
              collector,
              collector.transformers || {},
              preChain,
              partialEvent,
              pipelineIngest,
              respond,
              chainPath,
            );

            // Dropped or stopped: the event never reaches the collector.
            if (chainResult.copies.length === 0) {
              collector.logger.debug(
                `Event dropped by transformer chain${
                  chainResult.droppedBy ? ` (${chainResult.droppedBy})` : ''
                }`,
              );
              emitCollectorDrop(
                collector,
                partialEvent,
                pipelineIngest,
                chainResult.droppedBy,
                chainPath ?? 'collector.push.preChain',
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

            // Every finished copy goes on with its own ingest. The runner
            // owns identity: a single copy keeps the chain input's id, a fork
            // copy carries its derived id.
            if (chainResult.copies.length > 1) {
              // Process each forked copy through the rest of the pipeline
              const forkResults = await Promise.all(
                chainResult.copies.map(async (copy) => {
                  const full = createEvent(
                    collector,
                    prepareEvent(copy.event),
                    copy.ingest,
                  );
                  return pushToDestinations(
                    collector,
                    full,
                    { id, ingest: copy.ingest, respond },
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
                sourceStatus.count += chainResult.copies.length;
                sourceStatus.lastAt = Date.now();
                sourceStatus.duration += Date.now() - pushStart;
              }

              return forkResults[0] ?? createPushResult({ ok: true });
            }

            partialEvent = chainResult.copies[0].event;
            pipelineIngest = chainResult.copies[0].ingest;
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
          if (err instanceof InvalidEventError) {
            // Client input fault, not a pipeline failure: warn without a
            // stack, count it as a source rejection, and hand the caller a
            // discriminated result it can map to a 4xx response.
            // `id` is destructured inside the try body, which this sibling
            // callback does not see, so the source id comes from `options`.
            const sourceId = options.id;
            if (sourceId) {
              if (!collector.status.sources[sourceId]) {
                collector.status.sources[sourceId] = { count: 0, duration: 0 };
              }
              const sourceStatus = collector.status.sources[sourceId];
              sourceStatus.rejected = (sourceStatus.rejected ?? 0) + 1;
            }
            collector.logger.warn('invalid event rejected', {
              error: err.message,
            });
            return createPushResult({
              ok: false,
              invalid: true,
              error: err.message,
            });
          }
          collector.status.failed++;
          // Identify the event by NAME only. The log context is serialized
          // into stderr, the error ring and the managed-run jsonl sink, so it
          // stays primitive and low-cardinality: the full event (user,
          // consent, data) and the raw ingest payload would be a PII egress,
          // and per-event values would make every failure look distinct to
          // the ring's message dedup.
          collector.logger.error('push failed', {
            ...errorMeta(err),
            event: event.name,
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
