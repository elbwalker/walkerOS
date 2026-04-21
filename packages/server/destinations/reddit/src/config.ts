import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, pixelId } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!pixelId) logger.throw('Config settings pixelId missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    pixelId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
