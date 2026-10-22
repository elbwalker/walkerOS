import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { siteId, apiKey } = settings;

  if (!siteId || !apiKey) {
    const missing = [
      ...(siteId ? [] : ['siteId']),
      ...(apiKey ? [] : ['apiKey']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    siteId,
    apiKey,
    // Default identity resolution paths
    customerId: settings.customerId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
