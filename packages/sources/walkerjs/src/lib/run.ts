import type { SourceWalkerjs } from '../types';
import { assign, getId, tryCatch } from '@elbwalker/utils';
import { getGlobals } from './walker';
import { onApply } from './on';
import { pushPredefined } from './push';
import { load } from './trigger';
import { sessionStart } from './session';

export function run(
  instance: SourceWalkerjs.Instance,
  state: Partial<SourceWalkerjs.State> = {},
) {
  const { config, destinations } = instance;

  const newState = assign(
    {
      allowed: true, // When run is called, the walker may start running
      count: 0, // Reset the run counter
      queue: [], // Reset the queue for each run without merging
      group: getId(), // Generate a new group id for each run
      globals: assign(
        // Load globals properties
        // Use the static globals and search for tagged ones
        // Due to site performance only once every run
        config.globalsStatic,
        getGlobals(config.prefix),
      ),
    },
    { ...state },
  );

  // Update the instance reference with the updated state
  assign(instance, newState, { merge: false, shallow: false, extend: false });

  // Reset all destination queues
  Object.values(destinations).forEach((destination) => {
    destination.queue = [];
  });

  // Increase round counter
  if (++instance.round == 1) {
    // Run predefined elbLayer stack once for all non-command events
    pushPredefined(instance, false);
  } else {
    // Reset timing with each new run
    instance.timing = performance.now();
  }

  // Session handling
  const sessionConfig = config.session;
  if (sessionConfig) {
    // Disable session start for window after first round (for SPAs)
    if (!sessionConfig.storage && instance.round > 1)
      sessionConfig.isStart = false;

    sessionStart(instance, {
      ...sessionConfig, // Session detection configuration
      data: config.sessionStatic, // Static default session data
    });
  }

  // Call the predefined run events
  onApply(instance, 'run');

  tryCatch(load)(instance);
}
