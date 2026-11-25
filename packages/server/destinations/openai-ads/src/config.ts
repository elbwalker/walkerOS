import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { apiKey, pixelId } = settings;

  if (!apiKey || !pixelId) {
    const missing = [
      ...(apiKey ? [] : ['apiKey']),
      ...(pixelId ? [] : ['pixelId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  return { ...partialConfig, settings: { ...settings, apiKey, pixelId } };
}
