import type { WalkerOS } from '@elbwalker/types';
import type { DataLayer } from './types';
import { clone, tryCatch } from '@elbwalker/utils';
import { dataLayerToWalkerOS, gtagToObj } from './mapping';

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
    // Clone the arguments to avoid mutation
    const clonedArgs = clone(args);

    // Get the pushed items and eventually convert gtag to regular dataLayer pushes
    const items = isArguments(args[0]) ? [gtagToObj(clonedArgs)] : clonedArgs;

    const events = items.filter(isValidEvent);

    events.forEach((obj) => {
      // Map the incoming event to a WalkerOS event
      const event = dataLayerToWalkerOS(obj);

      // Hand over to walker instance
      if (event) elb(event);
    });
  })(...args);
}

function isArguments(value: unknown): value is IArguments {
  return typeof value === 'object' && value !== null && 'callee' in value;
}

function isValidEvent(value: unknown): value is WalkerOS.AnyObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'event' in value
  );
}
