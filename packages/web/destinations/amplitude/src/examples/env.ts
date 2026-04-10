import type { Env, IdentifyInstance, RevenueInstance } from '../types';

/**
 * Example environment configurations for the Amplitude destination.
 *
 * Tests clone `push` and replace individual methods with jest spies.
 * Production leaves `env.amplitude` undefined — the destination falls back
 * to the real `@amplitude/analytics-browser` module namespace.
 */

const noop = () => {};
const noopPromise = () => ({ promise: Promise.resolve() });

/**
 * Minimal chainable Identify mock. The real SDK class has the same shape.
 * Tests spy by replacing these methods with jest.fn() in the test runner.
 */
class MockIdentify implements IdentifyInstance {
  set() {
    return this;
  }
  setOnce() {
    return this;
  }
  add() {
    return this;
  }
  append() {
    return this;
  }
  prepend() {
    return this;
  }
  preInsert() {
    return this;
  }
  postInsert() {
    return this;
  }
  remove() {
    return this;
  }
  unset() {
    return this;
  }
  clearAll() {
    return this;
  }
}

/** Minimal chainable Revenue mock. */
class MockRevenue implements RevenueInstance {
  setProductId() {
    return this;
  }
  setPrice() {
    return this;
  }
  setQuantity() {
    return this;
  }
  setRevenueType() {
    return this;
  }
  setCurrency() {
    return this;
  }
  setRevenue() {
    return this;
  }
  setReceipt() {
    return this;
  }
  setReceiptSig() {
    return this;
  }
  setEventProperties() {
    return this;
  }
}

/**
 * Pre-init env — all methods are no-ops until the test runner wires spies.
 */
export const init: Env | undefined = {
  amplitude: {
    init: noopPromise,
    track: noop,
    identify: noop,
    revenue: noop,
    reset: noop,
    setOptOut: noop,
    setUserId: noop,
    setDeviceId: noop,
    setSessionId: noop,
    setGroup: noop,
    groupIdentify: noop,
    flush: noopPromise,
    add: noopPromise,
    Identify: MockIdentify,
    Revenue: MockRevenue,
  },
};

/**
 * Post-init env — same shape. The test runner clones this and replaces
 * individual methods with jest.fn() so it can assert on calls.
 */
export const push: Env = {
  amplitude: {
    init: noopPromise,
    track: noop,
    identify: noop,
    revenue: noop,
    reset: noop,
    setOptOut: noop,
    setUserId: noop,
    setDeviceId: noop,
    setSessionId: noop,
    setGroup: noop,
    groupIdentify: noop,
    flush: noopPromise,
    add: noopPromise,
    Identify: MockIdentify,
    Revenue: MockRevenue,
  },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:amplitude.init',
  'call:amplitude.track',
  'call:amplitude.identify',
  'call:amplitude.revenue',
  'call:amplitude.reset',
  'call:amplitude.setOptOut',
  'call:amplitude.setUserId',
  'call:amplitude.setDeviceId',
  'call:amplitude.setSessionId',
  'call:amplitude.setGroup',
  'call:amplitude.groupIdentify',
];
