import { assign, onLog } from '@elbwalker/utils';
import { NodeClient } from './types';

export function getState(
  initConfig: NodeClient.InitConfig,
  instance: Partial<NodeClient.Instance> = {},
): NodeClient.State {
  const defaultConfig: NodeClient.Config = {
    contracts: undefined, // Contract schemas
    globalsStatic: {}, // Static global properties
    sessionStatic: {}, // Static session data
    tagging: 0, // Helpful to differentiate the clients used setup version
    verbose: false, // Disable verbose logging
    onLog: log,
  };

  const config: NodeClient.Config = assign(
    defaultConfig,
    {
      ...(instance.config || {}), // current config
      ...initConfig, // new config
    },
    { merge: false, extend: false },
  );

  // Log with default verbose level
  function log(message: string, verbose?: boolean) {
    onLog({ message }, verbose || config.verbose);
  }
  config.onLog = log;

  // Extract remaining values from initConfig
  const {
    consent = {}, // Handle the consent states
    custom = {}, // Custom state support
    destinations = {}, // Destination list
    hooks = {}, // Manage the hook functions
    on = {}, // On events listener rules
    user = {}, // Handles the user ids
  } = initConfig;

  // Globals enhanced with the static globals from init and previous values
  const globals = { ...config.globalsStatic };

  return {
    allowed: false, // Wait for explicit run command to start
    config,
    consent,
    count: 0, // Event counter for each run
    custom,
    destinations,
    globals,
    group: '', // Random id to group events of a run
    hooks,
    on,
    queue: [], // Temporary event queue for all events of a run
    round: 0, // The first round is a special one due to state changes
    session: undefined, // Session data
    timing: 0, // Offset counter to calculate timing property
    user,
  };
}
