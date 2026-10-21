import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const {
    pixelId,
    eventId,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  } = settings;

  if (
    !pixelId ||
    !eventId ||
    !consumerKey ||
    !consumerSecret ||
    !accessToken ||
    !accessTokenSecret
  ) {
    const missing = [
      ...(pixelId ? [] : ['pixelId']),
      ...(eventId ? [] : ['eventId']),
      ...(consumerKey ? [] : ['consumerKey']),
      ...(consumerSecret ? [] : ['consumerSecret']),
      ...(accessToken ? [] : ['accessToken']),
      ...(accessTokenSecret ? [] : ['accessTokenSecret']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

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
