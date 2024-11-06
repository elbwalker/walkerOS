import type { WalkerOS } from '@elbwalker/types';

export function dataLayerToWalkerOS(
  ...clonedArgs: unknown[]
): WalkerOS.PartialEvent {
  clonedArgs;

  // @TODO dummy return
  return { event: 'e a' };
}
