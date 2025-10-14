import type { WalkerOS } from '@walkeros/core';
import type { GTMSettings, GTMMapping } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export function pushGTMEvent(
  event: WalkerOS.Event,
  settings: GTMSettings,
  mapping: GTMMapping = {},
  data: WalkerOS.AnyObject,
  env?: DestinationWeb.Env,
): void {
  const { window } = getEnv(env);
  const obj = { event: event.name }; // Use the name mapping by default

  (window.dataLayer as unknown[]).push({
    ...obj,
    ...(isObject(data) ? data : event),
  });
}
