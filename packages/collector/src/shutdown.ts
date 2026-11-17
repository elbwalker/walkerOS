import type {
  Collector,
  Destination,
  Elb,
  Lifecycle,
  Logger,
} from '@walkeros/core';
import {
  reportCause,
  StepError,
  stepId,
  toFailureReason,
} from '@walkeros/core';
import { createPushResult, mergePushResults } from './destination';

/** The longest one batch of a `walker flush` may take. */
const FLUSH_TIMEOUT = 5000;

/** What is left of a deadline (epoch ms), never below 0. */
function timeLeft(deadlineAt: number): number {
  return Math.max(0, deadlineAt - Date.now());
}

/**
 * Settles as `work` does, or rejects with a `timeout` StepError once `ms`
 * have passed. With no time left it rejects at once, unless `work` has
 * already settled. Its timer never outlives it.
 */
async function raceTimeout<T>(
  work: T | Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  const timedOut = () => new StepError(message, { code: 'timeout' });
  if (ms <= 0) return Promise.race([work, Promise.reject(timedOut())]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(timedOut()), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Destroy all steps in pipeline order: sources → destinations → transformers
 * → stores, each phase within what is left of `deadlineAt` (epoch ms).
 * Called by the collector's `shutdown` command handler.
 *
 * Answers `ok: false` naming each destination under `failed` whose pending
 * batch failed or timed out (`phase: 'flush'`, its events are lost), or
 * whose `destroy` timed out or threw (`phase: 'destroy'`, it did not close
 * cleanly, so events it buffered may be lost). A source, transformer or
 * store whose destroy fails is logged and not named.
 */
export async function destroyAllSteps(
  collector: Collector.Instance,
  deadlineAt: number,
): Promise<Elb.PushResult> {
  const logger = collector.logger;

  // Phase 1: Sources (stop intake)
  await destroyStepGroup(collector.sources, 'source', logger, deadlineAt);

  // Phase 2: Destinations, flush pending batches first, then close connections.
  const flushed = await flushDestinationBatches(collector, deadlineAt);
  const unclosed = await destroyStepGroup(
    collector.destinations,
    'destination',
    logger,
    deadlineAt,
  );

  // Phase 3: Transformers (release caches)
  await destroyStepGroup(
    collector.transformers,
    'transformer',
    logger,
    deadlineAt,
  );

  // Phase 4: Stores (release storage — last, so transformers can flush during their destroy)
  await destroyStepGroup(collector.stores, 'store', logger, deadlineAt);

  // Last: the repeats the cause log counted and never printed.
  collector.causeLog?.flush();

  // A lost batch outranks an unclean close of the same destination.
  return mergePushResults(createPushResult(withPhase(unclosed, 'destroy')), [
    { ...flushed, ...withPhase(flushed.failed ?? {}, 'flush') },
  ]);
}

/** The failed refs of one shutdown phase, marked with it; none, no key. */
function withPhase(
  failed: Record<string, Destination.Ref>,
  phase: NonNullable<Destination.Ref['phase']>,
): { failed?: Record<string, Destination.Ref> } {
  const entries = Object.entries(failed);
  if (!entries.length) return {};
  return {
    failed: Object.fromEntries(
      entries.map(([id, ref]) => [id, { ...ref, phase }]),
    ),
  };
}

/**
 * Flush every destination's pending batches now, through each batch's own
 * flush (the one definition `walker shutdown` and `walker flush` share). A
 * failed flush is failed through the outcome sink like any batch. Answers a
 * destination with pending entries as `done`, or `failed` with the reason;
 * a destination with nothing pending is not named. Each batch gets what is
 * left of `deadlineAt` (epoch ms), or 5 s of its own without one. The
 * collector keeps running.
 */
export async function flushDestinationBatches(
  collector: Collector.Instance,
  deadlineAt?: number,
): Promise<Elb.PushResult> {
  const done: Record<string, Destination.Ref> = {};
  const failed: Record<string, Destination.Ref> = {};

  const flushes = Object.entries(collector.destinations).map(
    async ([id, dest]) => {
      const batches = Object.values(dest.batches || {});
      const pending = batches.reduce(
        (sum, batch) => sum + batch.batched.entries.length,
        0,
      );
      const ref: Destination.Ref = { type: dest.type || 'unknown' };
      const outcomes = await Promise.all(
        batches.map(async (batch) => {
          const held = batch.batched.entries.length;
          const ms =
            deadlineAt === undefined ? FLUSH_TIMEOUT : timeLeft(deadlineAt);
          try {
            return await raceTimeout(
              batch.flush(),
              ms,
              `destination '${id}' batch flush timed out`,
            );
          } catch (err) {
            // An idle batch settles before any timer, so an empty batch cut
            // with time left had a fire in flight, whose events are lost. With
            // no time left the two look the same, so an empty one names nothing.
            if (!held && ms <= 0) return undefined;
            // The flush did not settle in time (`timeout`; it may still land
            // later) or rejected (its own reason): named in the result, one
            // cause line per cause.
            const reason = toFailureReason(err);
            ref.reason = reason;
            reportCause(
              collector,
              collector.logger,
              {
                step: stepId('destination', dest.config.id || id),
                code: reason.code,
                status: reason.status,
              },
              'batch flush failed',
              {
                type: dest.type,
                retryable: reason.retryable,
                error: reason.message,
              },
            );
            return undefined;
          }
        }),
      );
      if (!pending && !ref.reason) return;
      for (const outcome of outcomes) {
        if (outcome && outcome.reason && !ref.reason)
          ref.reason = outcome.reason;
      }
      if (ref.reason) failed[id] = ref;
      else done[id] = ref;
    },
  );
  await Promise.all(flushes);

  return createPushResult({
    ...(Object.keys(done).length && { done }),
    ...(Object.keys(failed).length && { failed }),
  });
}

/**
 * Destroy one group of steps side by side, each within what is left of
 * `deadlineAt`. Answers the steps whose destroy timed out or threw, by id.
 */
async function destroyStepGroup<
  T extends { config: unknown; env?: unknown; type?: string },
>(
  steps: Record<string, T>,
  label: string,
  rootLogger: Logger.Instance,
  deadlineAt: number,
): Promise<Record<string, Destination.Ref>> {
  const failed: Record<string, Destination.Ref> = {};
  const promises = Object.entries(steps).map(async ([id, step]) => {
    // Access destroy via cast: its DestroyContext<C,E> generic is contravariant,
    // so concrete step types aren't assignable to a structural destroy signature.
    // Safe because we pass each step's own config/env back to its own destroy.
    const destroy = (
      step as {
        destroy?: (ctx: Lifecycle.DestroyContext) => void | Promise<void>;
      }
    ).destroy;
    if (!destroy) return;

    const stepType = step.type || 'unknown';
    const logger = rootLogger.scope(stepType);

    const context: Lifecycle.DestroyContext = {
      id,
      config: step.config,
      env: step.env ?? {},
      logger,
    };

    try {
      await raceTimeout(
        destroy(context),
        timeLeft(deadlineAt),
        `${label} '${id}' destroy timed out`,
      );
    } catch (err) {
      logger.error(`${label} '${id}' destroy failed: ${err}`);
      failed[id] = { type: stepType, reason: toFailureReason(err) };
    }
  });

  await Promise.allSettled(promises);
  return failed;
}
