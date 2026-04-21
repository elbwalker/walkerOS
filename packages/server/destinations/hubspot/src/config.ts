import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, eventNamePrefix } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!eventNamePrefix) logger.throw('Config settings eventNamePrefix missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    eventNamePrefix,
    // Default identity resolution path
    email: settings.email ?? 'user.email',
    // Batch defaults
    batch: settings.batch ?? false,
    batchSize: Math.min(settings.batchSize ?? 50, 500),
  };

  return { ...partialConfig, settings: settingsConfig };
}
