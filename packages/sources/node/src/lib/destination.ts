import type { SourceNode, DestinationNode } from '../types';
import { getId, isSameType } from '@elbwalker/utils';
import { pushToDestinations } from './push';

export async function addDestination(
  instance: SourceNode.Instance,
  data: unknown = {},
  options: unknown = {},
) {
  if (!isSameType(data, {} as DestinationNode.Destination)) return;
  if (!isSameType(options, {} as DestinationNode.Config)) return;

  // Prefer explicit given config over default config
  const config = options || data.config || { init: false };

  const destination: DestinationNode.Destination = {
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
  instance: SourceNode.Instance,
  destination: DestinationNode.Destination,
) {
  // Check if the destination was initialized properly or try to do so
  if (destination.init && !destination.config.init) {
    const config = await destination.init(destination.config, instance);

    // Actively check for errors (when false)
    if (config === false) return config; // don't push if init is false

    // Update the destination config if it was returned
    if (config) destination.config = config;

    // Remember that the destination was initialized
    destination.config.init = true;
  }

  return true; // Destination is ready to push
}
