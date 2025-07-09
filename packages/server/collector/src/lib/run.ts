import type { ServerCollector } from '../types';
import { assign, getId } from '@walkerOS/utils';

export function run(
  instance: ServerCollector.Instance,
  state: Partial<ServerCollector.State> = {},
) {
  const { config, destinations } = instance;

  const newState = assign(
    {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      queue: [], // Reset the queue for each run without merging
      group: getId(), // Generate a new group id for each run
      globals: assign(config.globalsStatic || {}, state.globals),
      timing: Date.now(), // Set the timing offset
    },
    { ...state },
  );

  // Update the instance reference with the updated state
  assign(instance, newState, { merge: false, shallow: false, extend: false });

  ++instance.round; // Increase the round counter

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });
}
