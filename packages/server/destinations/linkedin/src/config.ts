import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, conversionRuleId } = settings;

  if (!accessToken || !conversionRuleId) {
    const missing = [
      ...(accessToken ? [] : ['accessToken']),
      ...(conversionRuleId ? [] : ['conversionRuleId']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    conversionRuleId,
    apiVersion: settings.apiVersion || '202604',
  };

  return { ...partialConfig, settings: settingsConfig };
}
