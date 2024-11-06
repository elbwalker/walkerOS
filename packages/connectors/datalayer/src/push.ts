import type { WalkerOS } from '@elbwalker/types';
import { clone, tryCatch } from '@elbwalker/utils';
import { mapPush } from './mapping';

export function intercept<T extends (...args: unknown[]) => ReturnType<T>>(
  orgPush: T,
  elb: WalkerOS.Elb,
): T {
  return function (...args: Parameters<T>): ReturnType<T> {
    push(elb, ...args);

    // Always call the original push function
    return orgPush(...args);
  } as T;
}

export function push(elb: WalkerOS.Elb, ...args: unknown[]) {
  return tryCatch((...args: unknown[]) => {
    // Clone the arguments to avoid mutation
    const clonedArgs = clone(args);

    // Map the incoming event to a WalkerOS event
    const event = mapPush(clonedArgs);

    // Hand over to walker instance
    elb(event);
  })(...args);
}
