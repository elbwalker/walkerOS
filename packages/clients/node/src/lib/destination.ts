import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient, NodeDestination } from '../types';
import { getId, isSameType, tryCatchAsync } from '@elbwalker/utils';
import { pushToDestinations } from './push';

export async function addDestination(
  instance: NodeClient.Instance,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as NodeDestination.Destination)) return;
  if (!isSameType(options, {} as NodeDestination.Config)) return;

  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: NodeDestination.Destination = {
    init: data.init,
    push: data.push,
    config,
    type: data.type,
  };

  let id = config.id; // Use given id
  if (!id) {
    // Generate a new id if none was given
    do {
      id = getId(4);
    } while (instance.destinations[id]);
  }

  instance.destinations[id] = destination;

  // Process previous events if not disabled
  if (config.queue !== false) destination.queue = [...instance.queue];
  return await pushToDestinations(instance, undefined, { [id]: destination });
}

export async function destinationInit(
  instance: NodeClient.Instance,
  destination: NodeDestination.Destination,
) {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const init =
      (await tryCatchAsync(destination.init, (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);
      })(destination.config, instance)) !== false; // Actively check for errors

    destination.config.init = init;

    // don't push if init is false
    if (!init) return false;
  }

  return true; // Destination is ready to push
}

export async function destinationPush(
  instance: NodeClient.Instance,
  destination: NodeDestination.Destination,
  event: WalkerOS.Event,
): Promise<boolean> {
  await destination.push([{ event }], destination.config, undefined, instance);

  // @TODO

  return true;
}
