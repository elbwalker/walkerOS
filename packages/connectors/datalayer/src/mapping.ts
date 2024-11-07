import type { WalkerOS } from '@elbwalker/types';
import { isObject } from './helper';

export function dataLayerToWalkerOS(
  event: WalkerOS.AnyObject,
): WalkerOS.PartialEvent | void {
  event;

  // @TODO dummy return
  return { event: 'e a' };
}

export function gtagToObj(args: WalkerOS.AnyObject): WalkerOS.AnyObject | void {
  const command = args[0];
  const value = args[1];
  const params = args[2];

  if (typeof command !== 'string') return;

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

  if (!event) return;

  return { event, ...data };
}
