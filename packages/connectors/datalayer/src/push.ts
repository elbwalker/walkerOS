import type { WalkerOS } from '@elbwalker/types';
import type { DataLayer } from './types';
import { clone, tryCatch } from '@elbwalker/utils';
import { dataLayerToWalkerOS } from './mapping';

export function intercept(
  dataLayer: DataLayer,
  // orgPush: T,
  elb: WalkerOS.Elb,
) {
  // Store the original push function to preserve existing functionality
  const dataLayerPush = dataLayer.push.bind(dataLayer);

  dataLayer.push = function (...args: unknown[]): number {
    push(elb, ...args);
    return dataLayerPush(...args); // Call the original push function
  };
}

export function push(elb: WalkerOS.Elb, ...args: unknown[]) {
  return tryCatch((...args: unknown[]) => {
    let events: Array<WalkerOS.AnyObject>;

    // Clone the arguments to avoid mutation
    const clonedArgs = clone(args);

    if (isArguments(args[0])) {
      // Probably a gtag event
      events = [gtagToEvent(...clonedArgs)];
    } else {
      // Probably a dataLayer event
      events = clonedArgs.filter(isObject);
    }

    events.forEach((obj) => {
      // Map the incoming event to a WalkerOS event
      const event = dataLayerToWalkerOS(obj);

      // Hand over to walker instance
      elb(event);
    });
  })(...args);
}

function gtagToEvent(...args: unknown[]): WalkerOS.AnyObject {
  args; // @TODO implement
  return {};
}

function isArguments(value: unknown): value is IArguments {
  return typeof value === 'object' && value !== null && 'callee' in value;
}

function isObject(value: unknown): value is WalkerOS.AnyObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
