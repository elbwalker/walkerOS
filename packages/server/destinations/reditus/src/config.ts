import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { apiKey, type } = settings;

  if (!apiKey)
    throw new StepError('Config settings apiKey missing', { code: 'config' });
  if (type !== undefined && type !== 'conversion' && type !== 'payment')
    throw new StepError(
      'Config settings type must be "conversion" or "payment"',
      { code: 'config' },
    );

  return { ...partialConfig, settings: { ...settings, apiKey } };
}
