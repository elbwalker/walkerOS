import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { siteId, apiKey } = settings;

  if (!siteId) logger.throw('Config settings siteId missing');
  if (!apiKey) logger.throw('Config settings apiKey missing');

  const settingsConfig: Settings = {
    ...settings,
    siteId: siteId as string,
    apiKey: apiKey as string,
    // Default identity resolution paths
    customerId: settings.customerId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
