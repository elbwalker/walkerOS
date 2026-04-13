import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, adAccountId } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!adAccountId) logger.throw('Config settings adAccountId missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    adAccountId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
