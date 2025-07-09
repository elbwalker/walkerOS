import { Const, assign } from '@walkerOS/utils';
import type { WebCollector } from '../types';

export function getState(
  initConfig: WebCollector.InitConfig,
  instance: Partial<WebCollector.Instance> = {},
): WebCollector.State {
  const defaultConfig: WebCollector.Config = {
    default: false, // Run in default mode
    dataLayer: false, // Do not use dataLayer by default
    dataLayerConfig: {}, // Configuration for dataLayer
    elbLayer: window.elbLayer || (window.elbLayer = []), // Async access api in window as array
    globalsStatic: {}, // Static global properties
    pageview: true, // Trigger a page view event by default
    prefix: Const.Commands.Prefix, // HTML prefix attribute
    run: false, // Run the walker by default
    session: {
      // Configuration for session handling
      storage: false, // Do not use storage by default
    },
    sessionStatic: {}, // Static session data
    tagging: 0, // Helpful to differentiate the used setup version
    verbose: false, // Disable verbose logging
  };

  const config: WebCollector.Config = assign(
    defaultConfig,
    {
      ...(instance.config || {}), // current config
      ...initConfig, // new config
    },
    { merge: false, extend: false },
  );

  // Optional values
  if (initConfig.elb) config.elb = initConfig.elb;
  if (initConfig.instance) config.instance = initConfig.instance;

  // Process default mode to enable both auto-run and dataLayer destination
  if (initConfig.default) {
    config.run = true;
    config.dataLayer = true;
  }

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
    version: '',
  };
}
