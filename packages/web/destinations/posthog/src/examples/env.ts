import type { Env, PostHogSDK } from '../types';

const noop = () => {};

/**
 * Shared no-op SDK. Tests clone and overwrite individual methods with
 * jest.fn() via the spyEnv() helper in the test runner.
 */
const noopSDK: PostHogSDK = {
  init: (() => noopSDK) as PostHogSDK['init'],
  capture: noop,
  identify: noop,
  setPersonProperties: noop,
  group: noop,
  reset: noop,
  opt_in_capturing: noop,
  opt_out_capturing: noop,
};

/**
 * Pre-init env — all methods are no-ops until the test runner wires spies.
 */
export const init: Env | undefined = {
  posthog: { ...noopSDK },
};

/**
 * Post-init env — same shape. The test runner clones this and replaces
 * individual methods with jest.fn() so it can assert on calls.
 */
export const push: Env = {
  posthog: { ...noopSDK },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:posthog.init',
  'call:posthog.capture',
  'call:posthog.identify',
  'call:posthog.setPersonProperties',
  'call:posthog.group',
  'call:posthog.reset',
  'call:posthog.opt_in_capturing',
  'call:posthog.opt_out_capturing',
];
