import type { WalkerOS } from '@elbwalker/types';
import { isObject } from './helper';

export function objToWalkerOS(
  event: WalkerOS.AnyObject,
): WalkerOS.PartialEvent | void {
  if (typeof event.event !== 'string') return;

  // @TODO other values
  return { event: event.event };
}

export function gtagToObj(args: WalkerOS.AnyObject): WalkerOS.AnyObject | void {
  const command = args[0];
  const value = args[1];
  const params = args[2];

  let event: string | undefined;
  let data: WalkerOS.AnyObject = {};

  switch (command) {
    case 'event':
      if (typeof value === 'string') event = value;
      if (isObject(params)) data = params;

      break;
    default:
      // Unknown command
      return;
  }

  return { ...data, event };
}
