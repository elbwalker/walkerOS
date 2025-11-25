import type { Config, Settings, PartialConfig } from './types';
import { throwError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { destinations } = settings;

  if (!destinations || destinations.length === 0)
    throwError('Config settings destinations missing or empty');

  const settingsConfig: Settings = {
    ...settings,
    destinations,
  };

  return { ...partialConfig, settings: settingsConfig };
}
