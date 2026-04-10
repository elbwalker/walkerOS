import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, pixelCode } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!pixelCode) logger.throw('Config settings pixelCode missing');

  const settingsConfig: Settings = {
    partner_name: 'walkerOS',
    ...settings,
    accessToken,
    pixelCode,
  };

  return { ...partialConfig, settings: settingsConfig };
}
