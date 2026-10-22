import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { writeKey, dataPlaneUrl } = settings;

  if (!writeKey || !dataPlaneUrl) {
    const missing = [
      ...(writeKey ? [] : ['writeKey']),
      ...(dataPlaneUrl ? [] : ['dataPlaneUrl']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    writeKey,
    dataPlaneUrl,
    userId: settings.userId ?? 'user.id',
    anonymousId: settings.anonymousId ?? 'user.session',
  };

  return { ...partialConfig, settings: settingsConfig };
}
