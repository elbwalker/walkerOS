import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export const DEFAULT_URL = 'https://widget.criteo.com/m/event?version=s2s_v0';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { partnerId, callerId } = settings;

  if (!partnerId) logger.throw('Config settings partnerId missing');
  if (!callerId) logger.throw('Config settings callerId missing');

  const settingsConfig: Settings = {
    siteType: 'd',
    url: DEFAULT_URL,
    ...settings,
    partnerId,
    callerId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
