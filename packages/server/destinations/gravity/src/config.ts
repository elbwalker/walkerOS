import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { apiKey } = settings;

  if (!apiKey)
    throw new StepError('Config settings apiKey missing', { code: 'config' });

  return { ...partialConfig, settings: { ...settings, apiKey } };
}
