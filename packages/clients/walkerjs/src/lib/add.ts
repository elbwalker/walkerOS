import type { WebClient, WebDestination } from '../types';
import { Hooks } from '@elbwalker/types';
import { getId } from '@elbwalker/utils';
import { pushToDestination } from './push';

export function addDestination(
  instance: WebClient.Instance,
  data: WebDestination.DestinationInit,
  options?: WebDestination.Config,
) {
  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: WebDestination.Destination = {
    ...data,
    config,
  };

  // Process previous events if not disabled
  if (config.queue !== false)
    instance.queue.forEach((pushEvent) => {
      pushToDestination(instance, destination, pushEvent);
    });

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (instance.destinations[id]);
  }
  instance.destinations[id] = destination;
}

export function addHook<Hook extends keyof Hooks.Functions>(
  instance: WebClient.Instance,
  name: Hook,
  hookFn: Hooks.Functions[Hook],
) {
  instance.hooks[name] = hookFn;
}
