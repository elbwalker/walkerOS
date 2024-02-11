import { assign, onLog } from '@elbwalker/utils';
import { NodeClient } from './types';

export function getConfig(
  values: NodeClient.PartialConfig = {},
  current: NodeClient.PartialConfig = {},
): NodeClient.Config {
  const globalsStatic = current.globalsStatic || {};
  const defaultConfig: NodeClient.Config = {
    allowed: false, // Wait for explicit run command to start
    client: '0.0.0', // Client version
    consent: {}, // Handle the consent states
    custom: {}, // Custom state support
    count: 0, // Event counter for each run
    destinations: {}, // Destination list
    globals: {}, // To be overwritten
    globalsStatic, // Basic values from initial config
    group: '', // Random id to group events of a run
    hooks: {}, // Manage the hook functions
    on: {}, // Manage the hook functions
    queue: [], // Temporary event queue for all events of a run
    round: 0, // The first round is a special one due to state changes
    timing: 0, // Offset counter to calculate timing property
    user: {}, // Handles the user ids
    tagging: 0, // Helpful to differentiate the clients used setup version
    source: {
      type: 'node',
      id: '',
      previous_id: '',
    },
    verbose: false, // Disable verbose logging
  };

  const config = {
    ...defaultConfig,
    ...current,
    ...values,
  };

  const globals = assign(
    globalsStatic,
    assign(current.globals || {}, values.globals || {}),
  );

  // Log with default verbose level
  function log(message: string, verbose?: boolean) {
    onLog({ message }, verbose || config.verbose);
  }

  // Value hierarchy: values > current > default
  return {
    ...config,
    globals,
    globalsStatic,
    onLog: log,
  };
}
