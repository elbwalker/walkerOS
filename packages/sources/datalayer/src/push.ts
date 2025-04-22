import type { Elb } from '@elbwalker/types';
import type { Config } from './types';
import {
  clone,
  filterValues,
  isArguments,
  isArray,
  isObject,
  tryCatchAsync,
} from '@elbwalker/utils';
import { objToEvent, gtagToObj } from './mapping';
import { getDataLayer } from './helper';

export function intercept(config: Config) {
  const dataLayer = getDataLayer(config.name);

  if (!dataLayer) return;

  // Store the original push function to preserve existing functionality
  const dataLayerPush = dataLayer.push.bind(dataLayer);

  dataLayer.push = function (...args: unknown[]): number {
    tryCatchAsync(push)(config, true, ...args);
    return dataLayerPush(...args); // Call the original push function
  };
}

export async function push(config: Config, live: boolean, ...args: unknown[]) {
  // Clone the arguments to avoid mutation
  const clonedArgs = clone(args);
  const entries = getEntries(clonedArgs);

  // Prevent infinite loops
  if (live && config.processing) {
    config.skipped?.push(entries);
    return;
  }

  // Get busy
  config.processing = true;

  await Promise.all(
    entries.map(
      tryCatchAsync(async (obj) => {
        // Filter out unwanted events
        if (config.filter && (await config.filter(obj))) return;

        // Map the incoming event to a WalkerOS event
        const mappedObj = await objToEvent(filterValues(obj), config);

        if (mappedObj) {
          const { command, event } = mappedObj;

          if (command) {
            if (command.name)
              await config.elb(command.name, command.data as Elb.PushData);
          } else if (event) {
            if (event.event) await config.elb(event);
          }
        }
      }),
    ),
  );

  // Finished processing
  config.processing = false;
}

function getEntries(args: unknown): unknown[] {
  if (isObject(args)) return [args]; // dataLayer.push
  if (isArray(args)) {
    if (isArguments(args[0])) return gtagToObj(args[0]); // gtag
    return args;
  }

  return [];
}
