import type { PushBatchFn } from './types';
import { resolveSettings } from './config';
import { deliver, toOutcome } from './lib/deliver';

/**
 * Sends a flushed batch. Resolves when every record landed, returns the
 * failed indices when some did, and throws when none did.
 */
export const pushBatch: PushBatchFn = async (batch, context) => {
  const { config, env, logger } = context;
  if (batch.entries.length === 0) return;

  const settings = resolveSettings(config.settings);
  const failures = await deliver(
    batch.entries.map(({ event, data }) => ({ event, data })),
    settings,
    env,
    logger,
  );

  return toOutcome(batch.entries.length, failures);
};
