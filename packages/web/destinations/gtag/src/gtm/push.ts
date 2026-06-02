import type { WalkerOS, Logger } from '@walkeros/core';
import type { GTMSettings, GTMMapping, Env } from '../types';
import { isArray, isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { defaultDataLayer } from './config';

export function pushGTMEvent(
  event: WalkerOS.Event,
  settings: GTMSettings,
  mapping: GTMMapping = {},
  data: unknown,
  env?: Env,
  _logger?: Logger.Instance,
): void {
  const { window } = getEnv<Env>(env);
  const obj = { event: event.name }; // Use the name mapping by default

  const dataLayerName = settings.dataLayer || defaultDataLayer;
  const existing = window[dataLayerName];
  const dataLayerArray: unknown[] = isArray(existing) ? existing : [];
  window[dataLayerName] = dataLayerArray;

  dataLayerArray.push({
    ...obj,
    ...(isObject(data) ? data : event),
  });
}
