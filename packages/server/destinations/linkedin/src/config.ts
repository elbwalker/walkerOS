import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, conversionRuleId } = settings;

  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!conversionRuleId)
    logger.throw('Config settings conversionRuleId missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    conversionRuleId,
    apiVersion: settings.apiVersion || '202604',
  };

  return { ...partialConfig, settings: settingsConfig };
}
