import { deliver } from './deliver';
import type { PushFn } from './types';

/**
 * Sends one event as a one-row insert.
 *
 * What the row looks like is decided in `deliver`, beside the same decision for
 * a flushed batch, so a mapped event takes the same path whether batching is on
 * or off.
 */
export const push: PushFn = async (event, { config, data, logger }) => {
  await deliver([{ event, data }], config, logger);
};
