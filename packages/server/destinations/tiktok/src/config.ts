import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { accessToken, pixelCode } = settings;

  if (!accessToken || !pixelCode) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(pixelCode ? [] : ['pixelCode']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    partner_name: 'walkerOS',
    ...settings,
    accessToken,
    pixelCode,
  };

  return { ...partialConfig, settings: settingsConfig };
}
