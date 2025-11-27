import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { destinations } = settings;

  if (!destinations || destinations.length === 0)
    logger.throw('Config settings destinations missing or empty');

  const settingsConfig: Settings = {
    ...settings,
    destinations,
  };

  return { ...partialConfig, settings: settingsConfig };
}
