import type { Collector, WalkerOS } from '@walkeros/core';
import { assign, getMappingValue, isObject } from '@walkeros/core';
import type { Config, Settings } from './types';

export function normalizeEventName(
  eventName: string,
  snakeCase = true,
): string {
  if (!snakeCase) return eventName;

  return eventName.replace(/\s+/g, '_').toLowerCase();
}

export async function getData(
  event: WalkerOS.Event,
  data: WalkerOS.AnyObject | undefined,
  config: Config,
  settings: Partial<Settings> | undefined,
  collector: Collector.Instance,
): Promise<WalkerOS.AnyObject> {
  const baseData = isObject(data) ? data : {};

  const configMappedData = config.data
    ? await getMappingValue(event, config.data, { collector })
    : {};

  const settingsMappedData = settings?.data
    ? await getMappingValue(event, settings.data, { collector })
    : {};

  const configData = isObject(configMappedData) ? configMappedData : {};
  const settingsData = isObject(settingsMappedData) ? settingsMappedData : {};

  return assign(assign(baseData, configData), settingsData);
}
