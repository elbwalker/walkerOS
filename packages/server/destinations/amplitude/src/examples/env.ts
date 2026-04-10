import type { Env, IdentifyInstance, RevenueInstance } from '../types';

const noop = () => {};
const noopPromise = () => ({ promise: Promise.resolve() });

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

export const init: Env | undefined = {
  amplitude: {
    init: noopPromise,
    track: noop,
    identify: noop,
    revenue: noop,
    setOptOut: noop,
    setGroup: noop,
    groupIdentify: noop,
    flush: noopPromise,
    Identify: MockIdentify,
    Revenue: MockRevenue,
  },
};

export const push: Env = {
  amplitude: {
    init: noopPromise,
    track: noop,
    identify: noop,
    revenue: noop,
    setOptOut: noop,
    setGroup: noop,
    groupIdentify: noop,
    flush: noopPromise,
    Identify: MockIdentify,
    Revenue: MockRevenue,
  },
};

export const simulation = [
  'call:amplitude.init',
  'call:amplitude.track',
  'call:amplitude.identify',
  'call:amplitude.revenue',
  'call:amplitude.setOptOut',
  'call:amplitude.setGroup',
  'call:amplitude.groupIdentify',
];
