import type { WalkerOS } from '@elbwalker/types';
import type { Config } from './types';
import { clone, filterValues, isArguments, tryCatch } from '@elbwalker/utils';
import { objToEvent, gtagToObj } from './mapping';

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
      const items = isArguments(clonedArgs[0])
        ? [gtagToObj(clonedArgs[0])] // Convert gtag to dataLayer
        : clonedArgs; // Regular dataLayer push

      items.forEach((obj) => {
        // Map the incoming event to a WalkerOS event
        const mappedObj = objToEvent(filterValues(obj), config);

        if (mappedObj) {
          const { command, event } = mappedObj;

          if (command) {
            config.elb(command.name, command.data as WalkerOS.PushData);
          } else if (event) {
            // Prevent duplicate events
            if (config.processedEvents.has(event.id)) return;
            config.processedEvents.add(event.id);

            // Hand over to walker instance
            config.elb(event);
          }
        }
      });
    },
    // eslint-disable-next-line no-console
    console.error,
  )(...args);
}
