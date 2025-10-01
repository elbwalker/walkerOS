// Shared mapping utilities for all Google tools
import type { WalkerOS, Collector } from '@walkeros/core';
import { getMappingValue, assign, isObject } from '@walkeros/core';
import type { BaseSettings, Config } from '../types';

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
  toolSettings: BaseSettings | undefined,
  collector: Collector.Instance,
): Promise<WalkerOS.AnyObject> {
  const baseData = isObject(data) ? data : {};

  // Get config-level mapped data
  const configMappedData = config.data
    ? await getMappingValue(event, config.data, { collector })
    : {};

  // Get tool-specific mapped data
  const toolMappedData = toolSettings?.data
    ? await getMappingValue(event, toolSettings.data, { collector })
    : {};

  // Ensure all values are objects before merging
  const configData = isObject(configMappedData) ? configMappedData : {};
  const toolData = isObject(toolMappedData) ? toolMappedData : {};

  // Merge with proper priority: base <- config <- tool
  return assign(assign(baseData, configData), toolData);
}
