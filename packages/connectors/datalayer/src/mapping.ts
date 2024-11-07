import type { WalkerOS } from '@elbwalker/types';
import { isObject } from './helper';

export function dataLayerToWalkerOS(
  event: WalkerOS.AnyObject,
): WalkerOS.PartialEvent | void {
  event;

  // @TODO dummy return
  return { event: 'e a' };
}

export function gtagToObj(args: unknown[]): WalkerOS.AnyObject | void {
  const [command, arg, params] = args;

  if (typeof command !== 'string') return;

  let event: string | undefined;
  let data: WalkerOS.AnyObject = {};

  switch (command) {
    case 'event':
      if (typeof arg === 'string') event = arg;
      if (isObject(params)) data = params;

      break;
    default:
      // Unknown command
      return;
  }

  return { event, ...data };
}
