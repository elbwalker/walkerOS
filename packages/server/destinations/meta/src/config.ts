import type { Config, Settings, PartialConfig } from './types';
import { throwError } from '@walkerOS/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, pixelId } = settings;

  if (!accessToken) throwError('Config settings accessToken missing');
  if (!pixelId) throwError('Config settings pixelId missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    pixelId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
