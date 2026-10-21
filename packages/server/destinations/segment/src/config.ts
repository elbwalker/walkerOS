import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { writeKey } = settings;

  if (!writeKey)
    throw new StepError('Config settings writeKey missing', { code: 'config' });

  const settingsConfig: Settings = {
    ...settings,
    writeKey,
    // Default identity resolution paths
    userId: settings.userId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
