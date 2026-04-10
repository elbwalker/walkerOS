import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { writeKey } = settings;

  if (!writeKey) logger.throw('Config settings writeKey missing');

  const settingsConfig: Settings = {
    ...settings,
    writeKey,
    // Default identity resolution paths
    userId: settings.userId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
