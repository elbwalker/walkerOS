import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { accessToken, tagId } = settings;

  if (!accessToken || !tagId) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(tagId ? [] : ['tagId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    url: 'https://capi.uet.microsoft.com/v1/',
    dataProvider: 'walkerOS',
    ...settings,
    accessToken,
    tagId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
