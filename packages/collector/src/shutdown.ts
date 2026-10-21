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
import { createPushResult } from './destination';

const STEP_TIMEOUT = 5000;

/**
 * Destroy all steps in pipeline order: sources → destinations → transformers.
 * Called by the collector's `shutdown` command handler.
 */
export async function destroyAllSteps(
  collector: Collector.Instance,
): Promise<void> {
  const logger = collector.logger;

  // Phase 1: Sources (stop intake)
  await destroyStepGroup(collector.sources, 'source', logger);

  // Phase 2: Destinations, flush pending batches first, then close connections.
  await flushDestinationBatches(collector);
  await destroyStepGroup(collector.destinations, 'destination', logger);

  // Phase 3: Transformers (release caches)
  await destroyStepGroup(collector.transformers, 'transformer', logger);

  // Phase 4: Stores (release storage — last, so transformers can flush during their destroy)
  await destroyStepGroup(collector.stores, 'store', logger);

  // Last: the repeats the cause log counted and never printed.
  collector.causeLog?.flush();
}

/**
 * Flush every destination's pending batches now, through each batch's own
 * flush (the one definition `walker shutdown` and `walker flush` share). A
 * failed flush is failed through the outcome sink like any batch. Answers a
 * destination with pending entries as `done`, or `failed` with the reason;
 * a destination with nothing pending is not named. The collector keeps
 * running.
 */
export async function flushDestinationBatches(
  collector: Collector.Instance,
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
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            return await Promise.race([
              batch.flush(),
              new Promise<never>((_, reject) => {
                timer = setTimeout(
                  () =>
                    reject(
                      new StepError(
                        `destination '${id}' batch flush timed out`,
                        { code: 'timeout' },
                      ),
                    ),
                  STEP_TIMEOUT,
                );
              }),
            ]);
          } catch (err) {
            // The flush did not settle in time (`timeout`; it may still land
            // later) or rejected (its own reason): named in the result, one
            // cause line per cause.
            const reason = toFailureReason(err);
            ref.reason = reason;
            reportCause(
              collector,
              collector.logger,
              {
                step: stepId('destination', id),
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
          } finally {
            if (timer) clearTimeout(timer);
          }
        }),
      );
      if (!pending) return;
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

async function destroyStepGroup<
  T extends { config: unknown; env?: unknown; type?: string },
>(
  steps: Record<string, T>,
  label: string,
  rootLogger: Logger.Instance,
): Promise<void> {
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

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        destroy(context),
        new Promise<void>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label} '${id}' destroy timed out`)),
            STEP_TIMEOUT,
          );
        }),
      ]);
    } catch (err) {
      logger.error(`${label} '${id}' destroy failed: ${err}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  });

  await Promise.allSettled(promises);
}
