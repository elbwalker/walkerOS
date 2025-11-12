import type { Config, Settings, PartialConfig } from './types';
import { throwError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, destinations } = settings;

  if (!accessToken) throwError('Config settings accessToken missing');
  if (!destinations || destinations.length === 0)
    throwError('Config settings destinations missing or empty');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    destinations,
  };

  return { ...partialConfig, settings: settingsConfig };
}
