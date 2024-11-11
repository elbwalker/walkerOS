import type { WalkerOS } from '@elbwalker/types';
import type { DataLayer } from './types';
import { clone, tryCatch } from '@elbwalker/utils';
import { objToEvent, gtagToObj } from './mapping';
import { wasArguments } from './helper';

export function intercept(dataLayer: DataLayer, elb: WalkerOS.Elb) {
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

    // Get the pushed items
    const items = wasArguments(clonedArgs[0])
      ? [gtagToObj(clonedArgs[0])] // Convert gtag to dataLayer
      : clonedArgs; // Regular dataLayer push

    items.forEach((obj) => {
      // Map the incoming event to a WalkerOS event
      const event = objToEvent(obj);

      // Hand over to walker instance
      if (event) elb(event);
    });
  }, console.error)(...args);
}
