import { isBoolean, isObject, isString } from '@walkeros/core';
import { isDomScope } from './scope';
import type { InitSettings, Settings } from './types';

/**
 * Get browser source configuration with defaults
 * @param initSettings - Initial settings to override defaults
 * @param envDocument - Document from environment (optional)
 * @returns Complete settings object with all defaults applied
 */
export function getConfig(
  initSettings: InitSettings = {},
  envDocument?: Document,
): Settings {
  return {
    prefix: 'data-elb',
    pageview: true,
    capture: true,
    elb: 'elb',
    elbLayer: 'elbLayer',
    scope: envDocument || undefined,
    ...initSettings,
  };
}

/**
 * Settings read back from a source instance, whose registry entry carries
 * them untyped: each field of its type is kept, any other takes its default.
 * An `elbLayer` array is not read back; its default applies.
 */
export function settingsFrom(value: unknown): Settings {
  if (!isObject(value)) return getConfig();
  const init: InitSettings = {};
  if (isString(value.prefix)) init.prefix = value.prefix;
  if (isBoolean(value.pageview)) init.pageview = value.pageview;
  if (isBoolean(value.capture)) init.capture = value.capture;
  if (isString(value.name)) init.name = value.name;
  if (isString(value.elb) || value.elb === false) init.elb = value.elb;
  if (isString(value.elbLayer) || isBoolean(value.elbLayer))
    init.elbLayer = value.elbLayer;
  if (isDomScope(value.scope)) init.scope = value.scope;
  return getConfig(init);
}
