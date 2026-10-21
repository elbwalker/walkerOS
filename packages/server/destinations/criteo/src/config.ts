import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export const DEFAULT_URL = 'https://widget.criteo.com/m/event?version=s2s_v0';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { partnerId, callerId } = settings;

  if (!partnerId || !callerId) {
    const missing = [
      ...(partnerId ? [] : ['partnerId']),
      ...(callerId ? [] : ['callerId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    siteType: 'd',
    url: DEFAULT_URL,
    ...settings,
    partnerId,
    callerId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
