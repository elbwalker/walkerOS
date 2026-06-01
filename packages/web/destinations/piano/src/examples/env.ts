import type { Env, PianoAnalytics } from '../types';

/**
 * Example environment configurations for the Piano destination.
 *
 * These environments provide standardized mock structures for testing and
 * development without loading the real Piano SDK. They satisfy the `Env`
 * interface directly, so no type casts are needed.
 */

const noop = () => {};

/** A no-op Piano SDK whose methods are wrapped by `mockEnv` to capture calls. */
function mockPa(): PianoAnalytics {
  return {
    setConfigurations: noop,
    sendEvent: noop,
    sendEvents: noop,
  };
}

/** SDK not yet present: init must tolerate a missing `pa`. */
export const init: Env = {
  window: {},
};

/** SDK present: used for capturing setConfigurations/sendEvent calls. */
export const push: Env = {
  window: {
    pa: mockPa(),
  },
};

/**
 * Simulation tracking paths
 * Specifies which function calls to track during simulation
 */
export const simulation = [
  'call:window.pa.sendEvent', // Track Piano sendEvent calls
];
