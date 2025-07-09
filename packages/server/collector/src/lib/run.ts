import type { ServerCollector } from '../types';
import { assign, getId } from '@walkerOS/utils';

export function run(
  collector: ServerCollector.Collector,
  state: Partial<ServerCollector.State> = {},
) {
  const { config, destinations } = collector;

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

  // Merge the globals instead of preferring the current state
  newState.globals = assign(config.globalsStatic, state.globals);

  // Update the collector reference with the updated state
  assign(collector, newState, { merge: false, shallow: false, extend: false });

  ++collector.round; // Increase the round counter

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });
}
