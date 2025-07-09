import type { WebCollector } from '../types';
import { assign, getId, onApply, tryCatch } from '@walkerOS/core';
import { getGlobals } from './walker';
import { pushPredefined } from './push';
import { load } from './trigger';
import { sessionStart } from './session';

export function run(
  collector: WebCollector.Collector,
  state: Partial<WebCollector.State> = {},
) {
  const { config, destinations } = collector;

  const newState = assign(
    {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      queue: [], // Reset the queue for each run without merging
      group: getId(), // Generate a new group id for each run
    },
    { ...state },
  );

  // Merge the globals instead of preferring the current state
  newState.globals = assign(
    // Load globals properties
    // Use the static globals and search for tagged ones
    // Due to site performance only once every run
    assign(config.globalsStatic, state.globals),
    getGlobals(config.prefix),
  );

  // Update the collector reference with the updated state
  assign(collector, newState, { merge: false, shallow: false, extend: false });

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });

  // Increase round counter
  if (++collector.round == 1) {
    // Run predefined elbLayer stack once for all non-command events
    pushPredefined(collector, false);
  } else {
    // Reset timing with each new run
    collector.timing = performance.now();
  }

  // Session handling
  const sessionConfig = config.session;
  if (sessionConfig) {
    // Disable session start for window after first round (for SPAs)
    if (!sessionConfig.storage && collector.round > 1)
      sessionConfig.isStart = false;

    sessionStart(collector, {
      ...sessionConfig, // Session detection configuration
      data: config.sessionStatic, // Static default session data
    });
  }

  // Call the predefined run events
  onApply(collector, 'run');

  tryCatch(load)(collector);
}
