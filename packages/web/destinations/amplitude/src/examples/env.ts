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
  _ops: Record<string, Record<string, unknown>> = {};

  private _record(op: string, prop: string, value?: unknown) {
    if (!this._ops[op]) this._ops[op] = {};
    this._ops[op][prop] = value;
    return this;
  }

  set(prop: string, value: unknown) {
    return this._record('set', prop, value);
  }
  setOnce(prop: string, value: unknown) {
    return this._record('setOnce', prop, value);
  }
  add(prop: string, value: unknown) {
    return this._record('add', prop, value);
  }
  append(prop: string, value: unknown) {
    return this._record('append', prop, value);
  }
  prepend(prop: string, value: unknown) {
    return this._record('prepend', prop, value);
  }
  preInsert(prop: string, value: unknown) {
    return this._record('preInsert', prop, value);
  }
  postInsert(prop: string, value: unknown) {
    return this._record('postInsert', prop, value);
  }
  remove(prop: string, value: unknown) {
    return this._record('remove', prop, value);
  }
  unset(prop: string) {
    return this._record('unset', prop);
  }
  clearAll() {
    this._ops['clearAll'] = {};
    return this;
  }

  toJSON() {
    return this._ops;
  }
}

/** Minimal chainable Revenue mock. */
class MockRevenue implements RevenueInstance {
  _data: Record<string, unknown> = {};

  setProductId(v: string) {
    this._data.productId = v;
    return this;
  }
  setPrice(v: number) {
    this._data.price = v;
    return this;
  }
  setQuantity(v: number) {
    this._data.quantity = v;
    return this;
  }
  setRevenueType(v: string) {
    this._data.revenueType = v;
    return this;
  }
  setCurrency(v: string) {
    this._data.currency = v;
    return this;
  }
  setRevenue(v: number) {
    this._data.revenue = v;
    return this;
  }
  setReceipt(v: string) {
    this._data.receipt = v;
    return this;
  }
  setReceiptSig(v: string) {
    this._data.receiptSig = v;
    return this;
  }
  setEventProperties(v: unknown) {
    this._data.eventProperties = v;
    return this;
  }

  toJSON() {
    return this._data;
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
