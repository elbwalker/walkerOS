import type { Collector, WalkerOS, Elb, Ingest } from '@walkeros/core';
import {
  createIngest,
  emitStep,
  FatalError,
  getGrantedConsent,
  getSpanId,
  InvalidEventError,
  processEventMapping,
  reportCause,
  StepError,
  toFailureReason,
  tryCatchAsync,
  useHooks,
} from '@walkeros/core';
import { pushBounded, seededQueueMax } from './buffers';
import { createEvent, enrichEvent } from './handle';
import {
  chainFailureResult,
  createPushResult,
  mergePushResults,
  pushToDestinations,
} from './destination';
import {
  emitCollectorDrop,
  journeyFields,
  observerStepError,
  stepState,
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
            // Bounded: when full, the newest event is refused (the held ones
            // were promised already). That push answers `ok: false` with
            // `queue-full`, counted failed, one cause line.
            const max = seededQueueMax(collector.config.queueMax);
            const held = pushBounded(
              collector.preRunQueue,
              { event, options },
              { max, onOverflow: 'dropNewest' },
            );
            if (!held.appended) {
              const reason = toFailureReason(
                new StepError(
                  `collector.preRunQueue full (queueMax ${max}): event refused before run`,
                  { code: 'queue-full' },
                ),
              );
              collector.status.failed++;
              reportCause(
                collector,
                collector.logger,
                { step: 'collector', code: reason.code },
                'Push refused',
                {
                  event: event.name,
                  retryable: reason.retryable,
                  error: reason.message,
                },
              );
              return createPushResult({
                ok: false,
                reason,
                error: reason.message,
              });
            }
            collector.logger.debug('event held until run', {
              name: event.name,
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
          // A transformer of the source's next chain that failed in one copy
          // of a fork while another copy goes on.
          let preChainFailure: Elb.PushResult | undefined;

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

            // A rule that ignores the event: deliberately not forwarded, a
            // drop the result and observers see.
            if (processed.ignore) {
              const at = id ? `source.${id}` : 'collector.push';
              collector.logger.debug('Event ignored by source mapping', {
                at,
                mappingKey: processed.mappingKey,
              });
              emitCollectorDrop(collector, processed.event, pipelineIngest, {
                reason: 'ignored',
                at,
              });
              return createPushResult({ ok: true, dropped: true });
            }

            // Check consent requirements
            if (mapping.consent) {
              const eventConsent = processed.event.consent as
                | WalkerOS.Consent
                | undefined;
              const grantedConsent = getGrantedConsent(
                mapping.consent,
                collector.consent,
                eventConsent,
              );

              // Denied: the event never reaches the collector. Recorded
              // like a chain drop, with the consent gate as its reason.
              if (!grantedConsent) {
                const at = id ? `source.${id}` : 'collector.push';
                collector.logger.debug('Event dropped by source consent', {
                  at,
                  required: mapping.consent,
                });
                emitCollectorDrop(collector, processed.event, pipelineIngest, {
                  reason: 'consent',
                  at,
                  required: mapping.consent,
                  consent: { ...collector.consent, ...eventConsent },
                });
                return createPushResult({ ok: true, dropped: true });
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

            // A transformer failed and no copy goes on: the push fails.
            const chainFailure = chainResult.failure
              ? chainFailureResult(chainResult.failure)
              : undefined;
            if (chainFailure && chainResult.copies.length === 0)
              return chainFailure;

            // Dropped or stopped: the event never reaches the collector.
            if (chainResult.copies.length === 0) {
              collector.logger.debug(
                `Event dropped by transformer chain${
                  chainResult.droppedBy ? ` (${chainResult.droppedBy})` : ''
                }`,
              );
              emitCollectorDrop(collector, partialEvent, pipelineIngest, {
                reason: 'dropped',
                by: chainResult.droppedBy,
                at: chainPath ?? 'collector.push.preChain',
              });
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

              // Every copy's outcome is reported, worst first.
              const [first, ...rest] = forkResults;
              return mergePushResults(
                first,
                chainFailure ? [...rest, chainFailure] : rest,
              );
            }

            partialEvent = chainResult.copies[0].event;
            pipelineIngest = chainResult.copies[0].ingest;
            if (chainFailure) preChainFailure = chainFailure;
          }

          // Enrich into a full event (timing, source info, defaults)
          const fullEvent = enrichEvent(
            collector,
            partialEvent,
            pipelineIngest,
          );

          // Push to destinations with id and ingest
          const delivered = await pushToDestinations(
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

          return preChainFailure
            ? mergePushResults(delivered, [preChainFailure])
            : delivered;
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
            // WARN (the producer should act, the pipeline is fine), one line
            // per source per window: a client sending garbage cannot flood
            // the log.
            reportCause(
              collector,
              collector.logger,
              {
                step: sourceId ? `source.${sourceId}` : 'collector',
                code: 'invalid',
              },
              'invalid event rejected',
              { error: err.message },
              'warn',
            );
            return createPushResult({
              ok: false,
              invalid: true,
              error: err.message,
            });
          }
          collector.status.failed++;
          // A throwing rule `condition` (`mapping`) or any other fault: the
          // push fails with its reason. The line names the event by NAME
          // only, never the event or the ingest payload.
          const reason = toFailureReason(err);
          reportCause(
            collector,
            collector.logger,
            { step: 'collector', code: reason.code, status: reason.status },
            options.id ? `push failed at source.${options.id}` : 'push failed',
            {
              event: event.name,
              retryable: reason.retryable,
              error: reason.message,
            },
          );
          return createPushResult({
            ok: false,
            reason,
            error: reason.message,
          });
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
    const journey = journeyFields(identified, options?.ingest, collector);
    const started = Date.now();
    const inState = stepState(
      collector,
      'collector.push',
      'collector',
      'in',
      eventId,
      started,
      journey,
    );
    inState.inEvent = identified;
    emitStep(collector, inState);

    try {
      const result = await innerPush(identified, options);
      const finished = Date.now();
      const outState = stepState(
        collector,
        'collector.push',
        'collector',
        'out',
        // The same id as the in record. Reading it off the result instead
        // would split the wrap's own pair across two journeys whenever the
        // result reports a different event: a fan-out reporting its first
        // child, or a `prePush` hook that swapped the event.
        eventId,
        finished,
        journey,
      );
      outState.durationMs = finished - started;
      outState.outEvent = result;
      emitStep(collector, outState);
      return result;
    } catch (err) {
      const finished = Date.now();
      const errState = stepState(
        collector,
        'collector.push',
        'collector',
        'error',
        eventId,
        finished,
        journey,
      );
      errState.durationMs = finished - started;
      errState.error = observerStepError(err);
      emitStep(collector, errState);
      throw err;
    }
  };

  return wrapped;
}
