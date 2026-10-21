import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { accessToken, eventNamePrefix } = settings;

  if (!accessToken || !eventNamePrefix) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(eventNamePrefix ? [] : ['eventNamePrefix']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    eventNamePrefix,
    // Default identity resolution path
    email: settings.email ?? 'user.email',
  };

  return { ...partialConfig, settings: settingsConfig };
}
