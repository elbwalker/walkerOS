import type { PushBatchFn } from './types';
import { resolveSettings } from './config';
import { deliver, toOutcome } from './lib/deliver';

/**
 * Sends a flushed batch. Resolves when every record landed, returns the
 * failed indices when some did, and throws when none did. Silent rules have
 * no record of their own: they are not sent and count as delivered.
 */
export const pushBatch: PushBatchFn = async (batch, context) => {
  const { config, env, logger } = context;

  const settings = resolveSettings(config.settings);
  // Each record keeps its index in the flushed batch for the outcome.
  const sending = batch.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !entry.rule?.silent);
  const failures = sending.length
    ? await deliver(
        sending.map(({ entry: { event, data } }) => ({ event, data })),
        settings,
        env,
        logger,
      )
    : [];

  return toOutcome(
    batch.entries.length,
    failures.map(({ index, error }) => ({
      index: sending[index].index,
      error,
    })),
  );
};
