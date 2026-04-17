import type {
  Env,
  OptimizelyClient,
  OptimizelyUserContext,
  OptimizelySDK,
} from '../types';

/**
 * Example environment configurations for Optimizely destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves `env.optimizely` undefined -- the destination falls back
 * to the real `@optimizely/optimizely-sdk` import.
 */

const noop = () => {};

// Narrow helper types for mock SDK factory functions without loose casts.
type OptCreateInstance = OptimizelySDK['createInstance'];
type OptCreatePollingConfigMgr =
  OptimizelySDK['createPollingProjectConfigManager'];
type OptCreateBatchEventProcessor = OptimizelySDK['createBatchEventProcessor'];
type OptCreateUserContext = OptimizelyClient['createUserContext'];
type OptOnReady = OptimizelyClient['onReady'];
type OptTrackEvent = OptimizelyUserContext['trackEvent'];
type OptSetAttribute = OptimizelyUserContext['setAttribute'];

function createMockUserContext(): OptimizelyUserContext {
  return {
    trackEvent: noop as OptTrackEvent,
    setAttribute: noop as OptSetAttribute,
  };
}

function createMockClient(): OptimizelyClient {
  return {
    onReady: (() => Promise.resolve({ success: true })) as OptOnReady,
    createUserContext: (() => createMockUserContext()) as OptCreateUserContext,
    close: noop,
  };
}

function createMockSDK(): OptimizelySDK {
  return {
    createInstance: (() => createMockClient()) as OptCreateInstance,
    createPollingProjectConfigManager:
      (() => ({})) as OptCreatePollingConfigMgr,
    createBatchEventProcessor: (() => ({})) as OptCreateBatchEventProcessor,
  };
}

/**
 * Pre-init env -- all methods are no-ops until the test runner wires spies.
 */
export const init: Env | undefined = {
  optimizely: createMockSDK(),
};

/**
 * Post-init env -- same shape. The test runner clones this and replaces
 * individual methods with jest.fn() so it can assert on calls.
 */
export const push: Env = {
  optimizely: createMockSDK(),
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:optimizely.createInstance',
  'call:optimizely.client.onReady',
  'call:optimizely.client.createUserContext',
  'call:optimizely.userContext.trackEvent',
  'call:optimizely.userContext.setAttribute',
  'call:optimizely.client.close',
];
