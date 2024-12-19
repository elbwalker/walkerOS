import type { WalkerOS } from '@elbwalker/types';
import type { Config } from './types';
import {
  clone,
  filterValues,
  isArguments,
  isArray,
  isObject,
  tryCatch,
} from '@elbwalker/utils';
import { objToEvent, gtagToObj } from './mapping';
import { getDataLayer } from './helper';

export function intercept(config: Config) {
  const dataLayer = getDataLayer(config.name);

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
      const entries = getEntries(clonedArgs);

      // Prevent infinite loops
      if (config.processing) {
        config.skipped?.push(entries);
        return;
      }

      config.processing = true;
      entries.forEach((obj) => {
        // Filter out unwanted events
        if (config.filter && !config.filter(obj)) return;

        // Map the incoming event to a WalkerOS event
        const mappedObj = objToEvent(filterValues(obj), config);

        if (mappedObj) {
          const { command, event } = mappedObj;

          if (command) {
            if (command.name)
              config.elb(command.name, command.data as WalkerOS.PushData);
          } else if (event) {
            if (event.event) config.elb(event);
          }
        }
      });

      // Finished processing
      config.processing = false;
    },
    // eslint-disable-next-line no-console
    console.error,
  )(...args);
}

function getEntries(args: unknown[]): unknown[] {
  if (isArray(args) && isArguments(args[0])) return [gtagToObj(args[0])]; // gtag
  if (isObject(args)) return [args]; // dataLayer.push
  return args;
}
