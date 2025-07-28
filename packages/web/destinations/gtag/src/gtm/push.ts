import type { WalkerOS } from '@walkeros/core';
import type { GTMSettings, GTMMapping, WindowData } from '../types';
import { isObject } from '@walkeros/core';

export function pushGTMEvent(
  event: WalkerOS.Event,
  settings: GTMSettings,
  mapping: GTMMapping = {},
  data: WalkerOS.AnyObject,
  wrap: (name: string, fn: Function) => Function,
): void {
  const win = window as WindowData;
  const push = wrap('dataLayer.push', win.dataLayer.push.bind(win.dataLayer));
  const obj = { event: event.event }; // Use the name mapping by default

  push({
    ...obj,
    ...(isObject(data) ? data : event),
  });
}
