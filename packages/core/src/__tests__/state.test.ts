import type { Collector, State, Store, WalkerOS } from '../types';
import { applyState, compileState } from '../state';
import type { GetStore } from '../state';
import { getByPath } from '../byPath';
import { FatalError } from '../fatalError';
import { serializeStoreValue, deserializeStoreValue } from '../store/codec';
import {
  createAsyncMockStore,
  createMockCollector,
  createMockStore,
} from './helpers/mocks';

function buildEvent(): WalkerOS.DeepPartialEvent {
  return {
    name: 'order complete',
    user: { session: 's1' },
    data: { gclid: 'g1' },
  };
}

/** A getStore that resolves named stores from a map and `undefined` -> __cache. */
function makeGetStore(stores: Record<string, Store.Instance>): GetStore {
  return (id) => (id ? stores[id] : stores.__cache);
}

describe('compileState', () => {
  test('normalizes a single State to a one-element array', () => {
    const single: State = {
      mode: 'get',
      key: 'user.session',
      value: 'data.gclid',
    };
    expect(compileState(single)).toHaveLength(1);
    expect(compileState([single, single])).toHaveLength(2);
  });
});

describe('applyState', () => {
  test('set writes the resolved value to the store under the resolved key', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector: Collector.Instance = createMockCollector({
      stores: { sessions: store },
    });
    const event = buildEvent();

    const out = await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(await store.get('s1')).toBe('g1');
    expect(out).toEqual(event);
  });

  test('get hit writes the fetched store value to the value path', async () => {
    const store = createMockStore();
    store.set('s1', 'g1');
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };

    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(getByPath(out, 'data.gclid')).toBe('g1');
  });

  test('get miss leaves the event unchanged (no key written)', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 'missing' },
      data: {},
    };

    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(out).toEqual(event);
  });

  test('set of an undefined payload skips the write', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(store._data.size).toBe(0);
  });

  test('key resolving to undefined/non-string skips the entry', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: {},
      data: { gclid: 'g1' },
    };

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(store._data.size).toBe(0);
  });

  test('set then get round-trips through a real async store', async () => {
    const store = createAsyncMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: { gclid: 'g1' },
    };

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    const readEvent: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };
    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'sessions',
          key: 'user.session',
          value: 'data.fetched',
        },
      ],
      getStore,
      readEvent,
      collector,
    );

    expect(getByPath(out, 'data.fetched')).toBe('g1');
  });

  test('value via fn shapes the set payload', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event = buildEvent();

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: { fn: () => 'computed' },
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(await store.get('s1')).toBe('computed');
  });

  test('key via fn resolves the store key', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event = buildEvent();

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: { fn: () => 'computedKey' },
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(await store.get('computedKey')).toBe('g1');
  });

  test('array of mixed get+set runs in order', async () => {
    const store = createMockStore();
    store.set('s1', 'stored');
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };

    const states: State[] = [
      {
        mode: 'get',
        store: 'sessions',
        key: 'user.session',
        value: 'data.fetched',
      },
      {
        mode: 'set',
        store: 'sessions',
        key: 'user.session',
        value: 'data.fetched',
      },
    ];
    const out = await applyState(states, getStore, event, collector);

    // get wrote 'stored' onto data.fetched, then set wrote data.fetched back
    expect(getByPath(out, 'data.fetched')).toBe('stored');
    expect(await store.get('s1')).toBe('stored');
  });

  test('store error is fail-open: logs, event unchanged, no throw', async () => {
    const failingStore: Store.Instance = {
      type: 'failing',
      config: {},
      get: async () => {
        throw new Error('boom');
      },
      set: async () => {
        throw new Error('boom');
      },
      delete: async () => undefined,
    };
    const getStore = makeGetStore({ sessions: failingStore });
    const collector = createMockCollector({
      stores: { sessions: failingStore },
    });
    const event = buildEvent();

    const out = await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
    );

    expect(out).toEqual(event);
    expect(collector.logger.error).toHaveBeenCalled();
  });

  test('FatalError from value resolution rejects (not swallowed)', async () => {
    const store = createMockStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });
    const event = buildEvent();

    await expect(
      applyState(
        [
          {
            mode: 'set',
            store: 'sessions',
            key: 'user.session',
            value: {
              fn: () => {
                throw new FatalError('fatal in state');
              },
            },
          },
        ],
        getStore,
        event,
        collector,
      ),
    ).rejects.toBeInstanceOf(FatalError);
    expect(collector.logger.error).not.toHaveBeenCalled();
  });

  test('default store (no store field) namespaces keys with "state:" in __cache', async () => {
    const cache = createMockStore();
    const getStore = makeGetStore({ __cache: cache });
    const collector = createMockCollector({ stores: { __cache: cache } });
    const event = buildEvent();

    await applyState(
      [{ mode: 'set', key: 'user.session', value: 'data.gclid' }],
      getStore,
      event,
      collector,
    );

    expect(cache._data.has('state:s1')).toBe(true);
    expect(cache._data.has('s1')).toBe(false);
  });

  // state must stay inert w.r.t. the cache-envelope change. It writes
  // payloads directly (no `{value, exp}` envelope, no TTL), so a structured
  // store round-trips them byte-exact, including binary leaves. A binary leaf
  // is not addressable through the mapping engine's value paths, so this
  // asserts the store contract `applyState` relies on directly: a structured
  // store serializes + deserializes a Uint8Array back to a Uint8Array (never
  // an envelope, never a Buffer).
  test('a structured store round-trips a Uint8Array value (state store contract)', async () => {
    const store = createStructuredStore();
    const bytes = new Uint8Array([0xff, 0x00, 0x80]);

    await store.set('k1', { blob: bytes });
    const stored = await store.get('k1');
    expect(stored).toEqual({ blob: bytes });
  });

  // A scalar value resolved through the mapping engine round-trips through a
  // structured store via the state set/get ops (the realistic state payload).
  test('set then get round-trips a scalar value through a structured store', async () => {
    const store = createStructuredStore();
    const getStore = makeGetStore({ sessions: store });
    const collector = createMockCollector({ stores: { sessions: store } });

    await applyState(
      [
        {
          mode: 'set',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      buildEvent(),
      collector,
    );
    expect(await store.get('s1')).toBe('g1');

    const fetchEvent: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };
    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'sessions',
          key: 'user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      fetchEvent,
      collector,
    );
    expect(getByPath(out, 'data.gclid')).toBe('g1');
  });

  // Default `__cache` still works for state after the cache-envelope change:
  // state never goes through the cache wrapper, so the envelope is irrelevant.
  test('set then get round-trips through the default __cache after the envelope change', async () => {
    const cache = createMockStore();
    const getStore = makeGetStore({ __cache: cache });
    const collector = createMockCollector({ stores: { __cache: cache } });
    const event = buildEvent();

    await applyState(
      [{ mode: 'set', key: 'user.session', value: 'data.gclid' }],
      getStore,
      event,
      collector,
    );

    const fetchEvent: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };
    const out = await applyState(
      [{ mode: 'get', key: 'user.session', value: 'data.gclid' }],
      getStore,
      fetchEvent,
      collector,
    );
    // The raw payload (no envelope) round-trips through state under `state:s1`.
    expect(getByPath(out, 'data.gclid')).toBe('g1');
  });
});

/**
 * A structured store that round-trips values through the shared core codec,
 * mirroring fs/s3/gcs in structured mode. Used to prove `applyState` writes
 * codec-friendly payloads (including binary leaves) with no cache envelope.
 */
function createStructuredStore(): Store.Instance {
  const bytes = new Map<string, Uint8Array>();
  return {
    type: 'structured',
    config: {},
    get(key: string): Store.StoreValue | undefined {
      const raw = bytes.get(key);
      return raw === undefined ? undefined : deserializeStoreValue(raw);
    },
    set(key: string, value: Store.StoreValue): void {
      bytes.set(key, serializeStoreValue(value));
    },
    delete(key: string): void {
      bytes.delete(key);
    },
  };
}
