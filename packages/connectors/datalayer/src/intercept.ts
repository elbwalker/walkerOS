import type { WalkerOS } from '@elbwalker/types';
import { clone, tryCatch } from '@elbwalker/utils';
import { mapPush } from './mapping';

export function interceptPush<T extends (...args: unknown[]) => ReturnType<T>>(
  originalPush: T,
  push: WalkerOS.Elb,
): T {
  return function (...args: Parameters<T>): ReturnType<T> {
    tryCatch((...args: Parameters<T>) => {
      // Clone the arguments to avoid mutation
      const clonedArgs = clone(args);

      // Map the incoming event to a WalkerOS event
      const event = mapPush(clonedArgs);

      // Hand over to walker instance
      push(event);
    })(...args);

    // Always call the original push function
    return originalPush(...args);
  } as T;
}
