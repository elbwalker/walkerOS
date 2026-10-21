import type {
  ValidatedConfig,
  Settings,
  PartialConfig,
  EventSource,
} from './types';
import { StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): ValidatedConfig {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { destinations, eventSource = 'WEB' } = settings;

  if (!destinations || destinations.length === 0)
    throw new StepError('Config settings destinations missing or empty', {
      code: 'config',
    });

  const settingsConfig: Settings & { eventSource: EventSource } = {
    ...settings,
    destinations,
    eventSource,
  };

  return { ...partialConfig, settings: settingsConfig };
}
