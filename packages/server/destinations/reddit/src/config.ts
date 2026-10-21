import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { accessToken, pixelId } = settings;

  if (!accessToken || !pixelId) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(pixelId ? [] : ['pixelId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    pixelId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
