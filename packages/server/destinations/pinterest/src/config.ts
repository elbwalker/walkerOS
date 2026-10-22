import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { accessToken, adAccountId } = settings;

  if (!accessToken || !adAccountId) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(adAccountId ? [] : ['adAccountId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    adAccountId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
