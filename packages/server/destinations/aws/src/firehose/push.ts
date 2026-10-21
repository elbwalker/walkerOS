import type { PushFn } from './types';
import { resolveSettings } from './config';
import { deliver } from './lib/deliver';

/**
 * Sends one event as one record. Resolves once AWS confirmed it, else throws.
 * A silent rule has no record of its own: nothing to send.
 */
export const push: PushFn = async function (event, context) {
  const { config, data, env, logger, rule } = context;
  const settings = resolveSettings(config.settings);

  if (!rule?.silent) {
    const [failure] = await deliver([{ event, data }], settings, env, logger);
    if (failure) throw failure.error;
  }
};
