import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { apiKey } = settings;

  if (!apiKey) logger.throw('Config settings apiKey missing');

  const settingsConfig: Settings = {
    ...settings,
    apiKey,
  };

  return { ...partialConfig, settings: settingsConfig };
}
