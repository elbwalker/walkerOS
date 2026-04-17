import type { Config, Settings, PartialConfig } from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const {
    pixelId,
    eventId,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  } = settings;

  if (!pixelId) logger.throw('Config settings pixelId missing');
  if (!eventId) logger.throw('Config settings eventId missing');
  if (!consumerKey) logger.throw('Config settings consumerKey missing');
  if (!consumerSecret) logger.throw('Config settings consumerSecret missing');
  if (!accessToken) logger.throw('Config settings accessToken missing');
  if (!accessTokenSecret)
    logger.throw('Config settings accessTokenSecret missing');

  const settingsConfig: Settings = {
    ...settings,
    pixelId,
    eventId,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    apiVersion: settings.apiVersion || '12',
  };

  return { ...partialConfig, settings: settingsConfig };
}
