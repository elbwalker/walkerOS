import type { Config, PartialConfig, Settings } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { apiKey, apiSecret } = settings;

  if (!apiKey || !apiSecret) {
    const missing = [
      ...(apiKey ? [] : ['apiKey']),
      ...(apiSecret ? [] : ['apiSecret']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    pod: 'us1',
    environment: 'production',
    ...settings,
    apiKey,
    apiSecret,
  };

  return { ...partialConfig, settings: settingsConfig };
}
