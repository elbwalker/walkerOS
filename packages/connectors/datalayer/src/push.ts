import type { WalkerOS } from '@elbwalker/types';
import type { Config } from './types';
import { clone, getId, tryCatch } from '@elbwalker/utils';
import { objToEvent, gtagToObj } from './mapping';
import { wasArguments } from './helper';

export function intercept(config: Config) {
  const { dataLayer } = config;

  // Store the original push function to preserve existing functionality
  const dataLayerPush = dataLayer.push.bind(dataLayer);

  dataLayer.push = function (...args: unknown[]): number {
    push(config, ...args);
    return dataLayerPush(...args); // Call the original push function
  };
}

export function push(config: Config, ...args: unknown[]) {
  return tryCatch(
    (...args: unknown[]) => {
      // Clone the arguments to avoid mutation
      const clonedArgs = clone(args);

      // Get the pushed items
      const items = wasArguments(clonedArgs[0])
        ? [gtagToObj(clonedArgs[0])] // Convert gtag to dataLayer
        : clonedArgs; // Regular dataLayer push

      items.forEach((obj) => {
        // Map the incoming event to a WalkerOS event
        const event = objToEvent(obj);

        if (event) {
          // Add an id for duplicate detection
          event.id = event.id || getId();

          if (!event.source) event.source = {} as WalkerOS.Source;
          if (!event.source.type) event.source.type = 'dataLayer';

          // Prevent duplicate events
          if (config.processedEvents.has(event.id)) return;
          config.processedEvents.add(event.id);

          // Hand over to walker instance
          config.elb(event);
        }
      });
    },
    // eslint-disable-next-line no-console
    console.error,
  )(...args);
}
