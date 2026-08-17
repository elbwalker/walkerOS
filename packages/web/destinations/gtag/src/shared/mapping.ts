// Shared mapping utilities for all Google tools
import type { WalkerOS, Collector } from '@walkeros/core';
import { getMappingValue, assign, isObject } from '@walkeros/core';
import type { BaseSettings, Config } from '../types';

/**
 * Coerce a parameter name into GA4's charset. Runs of illegal characters
 * collapse into a single underscore; already-legal underscores are left alone.
 *
 * Scope is deliberately narrow. GA4's docs also demand a leading letter and a
 * 40-character cap, but its real ingestion is more permissive than its docs,
 * so enforcing those here would risk renaming a parameter that reports today
 * to fix a failure never observed. Only the charset rewrite is applied, and
 * only because a hyphen in a parameter name is a failure seen in production.
 *
 * Case is preserved: uppercase is legal and GA4 names are case-sensitive.
 */
export function normalizeParamName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]+/g, '_');
}

/**
 * GA4 accepts event names that its own docs call invalid, spaces included, and
 * live properties report on them. Names are therefore left exactly as
 * configured unless `snakeCase` asks for the styling.
 */
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
