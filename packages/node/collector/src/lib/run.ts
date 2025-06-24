import type { NodeCollector } from '../types';
import { assign, getId } from '@walkerOS/utils';

export function run(
  instance: NodeCollector.Instance,
  state: Partial<NodeCollector.State> = {},
) {
  const { config, destinations } = instance;

  const newState = assign(
    {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      queue: [], // Reset the queue for each run without merging
      group: getId(), // Generate a new group id for each run
      timing: Date.now(), // Set the timing offset
    },
    { ...state },
  );

  newState.globals = assign(config.globalsStatic, state.globals);

  // Update the instance reference with the updated state
  assign(instance, newState, { merge: false, shallow: false, extend: false });

  ++instance.round; // Increase the round counter

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });
}
