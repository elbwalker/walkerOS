import type { WalkerOS, Logger } from '@walkeros/core';
import type { GTMSettings, GTMMapping, Env } from '../types';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export function pushGTMEvent(
  event: WalkerOS.Event,
  settings: GTMSettings,
  mapping: GTMMapping = {},
  data: WalkerOS.AnyObject,
  env?: Env,
  _logger?: Logger.Instance,
): void {
  const { window } = getEnv<Env>(env);
  const obj = { event: event.name }; // Use the name mapping by default

  window.dataLayer.push({
    ...obj,
    ...(isObject(data) ? data : event),
  });
}
