import type { WalkerOS } from '@elbwalker/types';

export function dataLayerToWalkerOS(
  event: WalkerOS.AnyObject,
): WalkerOS.PartialEvent | void {
  event;

  // @TODO dummy return
  return { event: 'e a' };
}

export function gtagToObj(args: unknown[]): WalkerOS.AnyObject | void {
  args; // @TODO implement
  return {};
}
