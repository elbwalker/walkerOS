import type { Config, PartialConfig, Settings } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { apiKey, apiSecret } = settings;

  if (!apiKey) logger.throw('Config settings apiKey missing');
  if (!apiSecret) logger.throw('Config settings apiSecret missing');

  const settingsConfig: Settings = {
    pod: 'us1',
    environment: 'production',
    ...settings,
    apiKey: apiKey as string,
    apiSecret: apiSecret as string,
  };

  return { ...partialConfig, settings: settingsConfig };
}
