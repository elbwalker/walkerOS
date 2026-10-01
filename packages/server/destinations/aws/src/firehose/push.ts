import type { PushFn } from './types';
import { resolveSettings } from './config';
import { deliver } from './lib/deliver';

/** Sends one event as one record. Resolves once AWS confirmed it, else throws. */
export const push: PushFn = async function (event, context) {
  const { config, data, env, logger } = context;
  const settings = resolveSettings(config.settings);

  const [failure] = await deliver([{ event, data }], settings, env, logger);
  if (failure) throw failure.error;
};
