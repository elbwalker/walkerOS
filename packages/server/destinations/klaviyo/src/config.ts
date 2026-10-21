import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { apiKey } = settings;

  if (!apiKey) {
    const missing = [...(apiKey ? [] : ['apiKey'])];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    apiKey,
    // Default identity resolution paths
    email: settings.email ?? 'user.email',
    externalId: settings.externalId ?? 'user.id',
    // Dedup key. Without one Klaviyo falls back to the event time truncated
    // to the second, which drops distinct events for a profile and metric
    // landing in the same second.
    uniqueId: settings.uniqueId ?? 'id',
  };

  return { ...partialConfig, settings: settingsConfig };
}
