import type {
  ValidatedConfig,
  Settings,
  PartialConfig,
  EventSource,
} from './types';
import type { Logger } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): ValidatedConfig {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { destinations, eventSource = 'WEB' } = settings;

  if (!destinations || destinations.length === 0)
    logger.throw('Config settings destinations missing or empty');

  const settingsConfig: Settings & { eventSource: EventSource } = {
    ...settings,
    destinations,
    eventSource,
  };

  return { ...partialConfig, settings: settingsConfig };
}
