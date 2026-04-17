import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { writeKey, dataPlaneUrl } = settings;

  if (!writeKey) logger.throw('Config settings writeKey missing');
  if (!dataPlaneUrl) logger.throw('Config settings dataPlaneUrl missing');

  const settingsConfig: Settings = {
    ...settings,
    writeKey,
    dataPlaneUrl,
    userId: settings.userId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
