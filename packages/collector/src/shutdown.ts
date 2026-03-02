import type { Collector, Lifecycle, Logger } from '@walkeros/core';

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

  // Phase 2: Destinations (close connections)
  await destroyStepGroup(collector.destinations, 'destination', logger);

  // Phase 3: Transformers (release caches)
  await destroyStepGroup(collector.transformers, 'transformer', logger);
}

async function destroyStepGroup(
  steps: Record<
    string,
    {
      destroy?: (ctx: Lifecycle.DestroyContext) => void | Promise<void>;
      config: unknown;
      env?: unknown;
      type?: string;
    }
  >,
  label: string,
  rootLogger: Logger.Instance,
): Promise<void> {
  const promises = Object.entries(steps).map(async ([id, step]) => {
    if (!step.destroy) return;

    const stepType = step.type || 'unknown';
    const logger = rootLogger.scope(stepType);

    const context: Lifecycle.DestroyContext = {
      id,
      config: step.config,
      env: step.env ?? {},
      logger,
    };

    try {
      await Promise.race([
        step.destroy(context),
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${label} '${id}' destroy timed out`)),
            STEP_TIMEOUT,
          ),
        ),
      ]);
    } catch (err) {
      logger.error(`${label} '${id}' destroy failed: ${err}`);
    }
  });

  await Promise.allSettled(promises);
}
