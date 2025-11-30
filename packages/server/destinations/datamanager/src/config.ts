import type { ValidatedConfig, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): ValidatedConfig {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { destinations, eventSource } = settings;

  if (!destinations || destinations.length === 0)
    logger.throw('Config settings destinations missing or empty');

  if (!eventSource) logger.throw('Config settings eventSource is required');

  const settingsConfig: Settings = {
    ...settings,
    destinations,
    eventSource,
  };

  return { ...partialConfig, settings: settingsConfig };
}
