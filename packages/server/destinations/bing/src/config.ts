import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, tagId } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!tagId) logger.throw('Config settings tagId missing');

  const settingsConfig: Settings = {
    url: 'https://capi.uet.microsoft.com/v1/',
    dataProvider: 'walkerOS',
    ...settings,
    accessToken,
    tagId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
