import type { Env, SegmentAnalytics, SegmentSDK } from '../types';

const noop = () => {};

/**
 * Pre-init env — load() returns an instance whose methods are all no-ops.
 * The test runner clones this and replaces instance methods with jest spies
 * to capture calls.
 */
function createMockInstance(): SegmentAnalytics {
  return {
    track: noop,
    identify: noop,
    group: noop,
    page: noop,
    alias: noop,
    reset: noop,
    setAnonymousId: noop,
  };
}

function createMockSDK(): SegmentSDK {
  return {
    load: () => createMockInstance(),
  };
}

export const init: Env | undefined = {
  analytics: createMockSDK(),
};

export const push: Env = {
  analytics: createMockSDK(),
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:analytics.load',
  'call:analytics.track',
  'call:analytics.identify',
  'call:analytics.group',
  'call:analytics.page',
  'call:analytics.alias',
  'call:analytics.reset',
  'call:analytics.setAnonymousId',
];
