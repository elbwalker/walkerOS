import type { Collector, Store } from '@walkeros/core';
import { getStateStore } from '../cache';

function makeStore(type: string): Store.Instance {
  const data = new Map<string, unknown>();
  return {
    type,
    config: {},
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    delete: (key) => {
      data.delete(key);
    },
  };
}

describe('getStateStore', () => {
  const named = makeStore('named');
  const cache = makeStore('cache');
  const collector: Pick<Collector.Instance, 'stores'> = {
    stores: { sessions: named, __cache: cache },
  };

  it('resolves an explicit store id', () => {
    expect(getStateStore('sessions', collector)).toBe(named);
  });

  it('falls back to __cache when store id is omitted', () => {
    expect(getStateStore(undefined, collector)).toBe(cache);
  });

  it('returns undefined for an unknown explicit store id', () => {
    expect(getStateStore('nope', collector)).toBeUndefined();
  });
});
