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
      key: 'event.user.session',
      value: 'event.data.gclid',
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
    );

    expect(out).toEqual(event);
    expect(collector.logger.warn).not.toHaveBeenCalled();
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
    );

    expect(store._data.size).toBe(0);
  });

  test('key that does not resolve warns and skips the entry', async () => {
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
    );

    expect(store._data.size).toBe(0);
    expect(collector.logger.warn).toHaveBeenCalledWith(
      '[state] key did not resolve',
      { mode: 'set', store: 'sessions', key: 'event.user.session' },
    );
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
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
          key: 'event.user.session',
          value: 'event.data.fetched',
        },
      ],
      getStore,
      readEvent,
      collector,
      {},
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
          key: 'event.user.session',
          value: { fn: () => 'computed' },
        },
      ],
      getStore,
      event,
      collector,
      {},
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
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
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
        key: 'event.user.session',
        value: 'event.data.fetched',
      },
      {
        mode: 'set',
        store: 'sessions',
        key: 'event.user.session',
        value: 'event.data.fetched',
      },
    ];
    const out = await applyState(states, getStore, event, collector, {});

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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
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
            key: 'event.user.session',
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
        {},
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
      [{ mode: 'set', key: 'event.user.session', value: 'event.data.gclid' }],
      getStore,
      event,
      collector,
      {},
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      {},
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
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      fetchEvent,
      collector,
      {},
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
      [{ mode: 'set', key: 'event.user.session', value: 'event.data.gclid' }],
      getStore,
      event,
      collector,
      {},
    );

    const fetchEvent: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { session: 's1' },
      data: {},
    };
    const out = await applyState(
      [{ mode: 'get', key: 'event.user.session', value: 'event.data.gclid' }],
      getStore,
      fetchEvent,
      collector,
      {},
    );
    // The raw payload (no envelope) round-trips through state under `state:s1`.
    expect(getByPath(out, 'data.gclid')).toBe('g1');
  });
});

describe('applyState resolves against { event, ingest }', () => {
  function setup() {
    const store = createMockStore();
    const getStore = makeGetStore({ registry: store });
    const collector = createMockCollector({ stores: { registry: store } });
    return { store, getStore, collector };
  }

  test('set keys the store off an ingest path', async () => {
    const { store, getStore, collector } = setup();

    await applyState(
      [
        {
          mode: 'set',
          store: 'registry',
          key: 'ingest.site',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      { site: 'acme' },
    );

    expect(await store.get('acme')).toBe('g1');
  });

  test('set stores an ingest value as the payload', async () => {
    const { store, getStore, collector } = setup();

    await applyState(
      [
        {
          mode: 'set',
          store: 'registry',
          key: 'event.user.session',
          value: 'ingest.site',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      { site: 'acme' },
    );

    expect(await store.get('s1')).toBe('acme');
  });

  test('get keyed off ingest writes onto the event', async () => {
    const { store, getStore, collector } = setup();
    store.set('acme', { tier: 'enterprise' });
    const ingest: Record<string, unknown> = { site: 'acme' };

    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'registry',
          key: 'ingest.site',
          value: 'event.data.tenant',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      ingest,
    );

    expect(getByPath(out, 'data.tenant')).toEqual({ tier: 'enterprise' });
    expect(ingest).toEqual({ site: 'acme' });
  });

  test('get into ingest writes in place and leaves the event unchanged', async () => {
    const { store, getStore, collector } = setup();
    store.set('acme', { tier: 'enterprise' });
    const ingest: Record<string, unknown> = { site: 'acme' };
    const event = buildEvent();

    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'registry',
          key: 'ingest.site',
          value: 'ingest.tenant',
        },
      ],
      getStore,
      event,
      collector,
      ingest,
    );

    expect(ingest.tenant).toEqual({ tier: 'enterprise' });
    expect(out).toEqual(event);
  });

  test('an omitted ingest behaves as empty', async () => {
    const { store, getStore, collector } = setup();
    const event = buildEvent();

    const out = await applyState(
      [
        {
          mode: 'set',
          store: 'registry',
          key: 'ingest.site',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      undefined,
    );

    expect(out).toEqual(event);
    expect(store._data.size).toBe(0);
  });

  test('a later entry sees an earlier ingest write', async () => {
    const { store, getStore, collector } = setup();
    store.set('acme', 'tenant-1');
    const ingest: Record<string, unknown> = { site: 'acme' };
    await applyState(
      [
        {
          mode: 'get',
          store: 'registry',
          key: 'ingest.site',
          value: 'ingest.tenantId',
        },
        {
          mode: 'set',
          store: 'registry',
          key: 'ingest.tenantId',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      ingest,
    );

    expect(await store.get('tenant-1')).toBe('g1');
  });

  test('consent gating reads the event consent', async () => {
    const { store, getStore, collector } = setup();
    const event: WalkerOS.DeepPartialEvent = {
      ...buildEvent(),
      consent: { marketing: true },
    };

    await applyState(
      [
        {
          mode: 'set',
          store: 'registry',
          key: { key: 'event.user.session', consent: { marketing: true } },
          value: 'event.data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
    );

    expect(await store.get('s1')).toBe('g1');
  });

  test('a bare path no longer resolves and warns', async () => {
    const { store, getStore, collector } = setup();

    await applyState(
      [
        {
          mode: 'set',
          store: 'registry',
          key: 'user.session',
          value: 'event.data.gclid',
        },
      ],
      getStore,
      buildEvent(),
      collector,
      {},
    );

    expect(store._data.size).toBe(0);
    expect(collector.logger.warn).toHaveBeenCalledWith(
      '[state] key did not resolve',
      { mode: 'set', store: 'registry', key: 'user.session' },
    );
  });

  test('a get target without a prefix warns and writes nothing', async () => {
    const { store, getStore, collector } = setup();
    store.set('s1', 'g2');
    const event = buildEvent();

    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'registry',
          key: 'event.user.session',
          value: 'data.gclid',
        },
      ],
      getStore,
      event,
      collector,
      {},
    );

    expect(out).toEqual(event);
    expect(collector.logger.warn).toHaveBeenCalledWith(
      '[state] get target needs an event. or ingest. prefix',
      { store: 'registry', value: 'data.gclid' },
    );
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

describe('applyState get with mapping', () => {
  const nonJsonWarning =
    '[state] stored value has null or non-JSON values, mapping drops them';

  async function getWith(
    stored: Store.StoreValue | undefined,
    entry: Partial<Pick<State, 'value' | 'mapping'>>,
    event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { id: 'u1', hash: 'h1' },
    },
    ingest: Record<string, unknown> = {},
  ) {
    const store = createMockStore();
    if (stored !== undefined) store.set('u1', stored);
    const collector = createMockCollector({ stores: { customers: store } });
    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'customers',
          key: 'event.user.id',
          value: 'event.user',
          ...entry,
        },
      ],
      makeGetStore({ customers: store }),
      event,
      collector,
      ingest,
    );
    return { out, collector, ingest };
  }

  test('picks several fields and keeps the rest of the target', async () => {
    const { out } = await getWith(
      { ltv: 1840, segment: 'loyal', email: 'x@y' },
      { mapping: { map: { ltv: 'ltv', segment: 'segment' } } },
    );
    expect(out.user).toEqual({
      id: 'u1',
      hash: 'h1',
      ltv: 1840,
      segment: 'loyal',
    });
  });

  test('a miss writes declared fallbacks only, silently', async () => {
    const { out, collector } = await getWith(undefined, {
      mapping: {
        map: { segment: { key: 'segment', value: 'unknown' }, ltv: 'ltv' },
      },
    });
    expect(out.user).toEqual({ id: 'u1', hash: 'h1', segment: 'unknown' });
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('a miss without fallbacks leaves the event unchanged, silently', async () => {
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const { out, collector } = await getWith(
      undefined,
      { mapping: { map: { ltv: 'ltv' } } },
      event,
    );
    expect(out).toEqual(event);
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('condition false skips on a miss', async () => {
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const { out } = await getWith(
      undefined,
      {
        mapping: {
          condition: (v) => v !== undefined,
          map: { segment: { key: 'segment', value: 'unknown' } },
        },
      },
      event,
    );
    expect(out).toEqual(event);
  });

  test.each([
    ['set', { set: ['ltv', 'segment'] }],
    ['loop', { loop: ['this', { key: 'ltv' }] }],
  ] satisfies Array<[string, State['mapping']]>)(
    '%s producers on a miss write nothing',
    async (_, mapping) => {
      const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
      const { out } = await getWith(undefined, { mapping }, event);
      expect(out).toEqual(event);
    },
  );

  test('validate rejects bad data and the fallback applies', async () => {
    const { out } = await getWith(
      { ltv: 'bad' },
      {
        value: 'event.user.ltv',
        mapping: {
          key: 'ltv',
          validate: (v) => typeof v === 'number',
          value: 0,
        },
      },
    );
    expect(out.user?.ltv).toBe(0);
  });

  test('a null leaf is dropped, the other fields land, with a non-JSON warning', async () => {
    const { out, collector } = await getWith(
      { ltv: 1840, segment: null },
      { mapping: { map: { ltv: 'ltv', segment: 'segment' } } },
    );
    expect(out.user).toEqual({ id: 'u1', hash: 'h1', ltv: 1840 });
    expect(collector.logger.warn).toHaveBeenCalledWith(nonJsonWarning, {
      store: 'customers',
    });
  });

  test('a picked object with a null inside is dropped whole', async () => {
    const { out } = await getWith(
      { ltv: 1, address: { street: 'x', zip: null } },
      { mapping: { map: { ltv: 'ltv', address: 'address' } } },
    );
    expect(out.user).toEqual({ id: 'u1', hash: 'h1', ltv: 1 });
  });

  test('a stored consent field does not gate, the event consent does', async () => {
    const { out } = await getWith(
      { consent: { marketing: true }, segment: 'x' },
      {
        mapping: {
          map: { segment: { key: 'segment', consent: { marketing: true } } },
        },
      },
      {
        name: 'order complete',
        user: { id: 'u1', hash: 'h1' },
        consent: { marketing: false },
      },
    );
    expect(out.user).not.toHaveProperty('segment');
  });

  test('a consent key on a loop item does not gate it, the event consent does', async () => {
    const { out } = await getWith(
      { orders: [{ consent: { marketing: true }, id: 'a' }] },
      {
        value: 'event.user.orders',
        mapping: {
          loop: ['orders', { key: 'id', consent: { marketing: true } }],
        },
      },
      {
        name: 'order complete',
        user: { id: 'u1', hash: 'h1' },
        consent: { marketing: false },
      },
    );
    expect(out.user).not.toHaveProperty('orders');
  });

  test('fn receives the real event', async () => {
    const { out } = await getWith(
      { ltv: 1 },
      {
        value: 'event.user.owner',
        mapping: { fn: (_v, ctx) => ctx.event.user?.id },
      },
    );
    expect(out.user?.owner).toBe('u1');
  });

  test('a FatalError from the mapping rethrows', async () => {
    await expect(
      getWith(
        { ltv: 1 },
        {
          mapping: {
            fn: () => {
              throw new FatalError('stop');
            },
          },
        },
      ),
    ).rejects.toThrow('stop');
  });

  test('a primitive target is replaced by an object result', async () => {
    const { out } = await getWith(
      { ltv: 1 },
      { value: 'event.data.profile', mapping: { map: { ltv: 'ltv' } } },
      {
        name: 'order complete',
        user: { id: 'u1' },
        data: { profile: 'legacy' },
      },
    );
    expect(out.data?.profile).toEqual({ ltv: 1 });
  });

  test('a stored primitive with a path mapping writes nothing, silently', async () => {
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const { out, collector } = await getWith(
      1840,
      { mapping: { map: { ltv: 'ltv' } } },
      event,
    );
    expect(out).toEqual(event);
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('an object source with nothing picked is silent', async () => {
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const { out, collector } = await getWith(
      { other: 1 },
      { mapping: { map: { ltv: 'ltv' } } },
      event,
    );
    expect(out).toEqual(event);
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('fn receives a stored primitive', async () => {
    const { out } = await getWith(1840, {
      value: 'event.user.ltv',
      mapping: {
        fn: (v) => (typeof v === 'number' ? Math.round(v / 100) : undefined),
      },
    });
    expect(out.user?.ltv).toBe(18);
  });

  test('an ingest target merges in place', async () => {
    const ingest: Record<string, unknown> = { customer: { id: 'u1' } };
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const result = await getWith(
      { ltv: 5 },
      { value: 'ingest.customer', mapping: { map: { ltv: 'ltv' } } },
      event,
      ingest,
    );
    expect(result.ingest).toBe(ingest);
    expect(ingest.customer).toEqual({ id: 'u1', ltv: 5 });
    expect(result.out).toEqual(event);
  });

  test('the input event is not mutated', async () => {
    const event = { name: 'order complete', user: { id: 'u1', hash: 'h1' } };
    const before = JSON.parse(JSON.stringify(event));
    await getWith(
      { ltv: 1840, segment: 'loyal' },
      { mapping: { map: { ltv: 'ltv', segment: 'segment' } } },
      event,
    );
    expect(event).toEqual(before);
  });

  test('without mapping a row containing null is still written raw', async () => {
    const { out, collector } = await getWith(
      { ltv: 1840, segment: null },
      { value: 'event.data.customer' },
    );
    expect(out.data?.customer).toEqual({ ltv: 1840, segment: null });
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });
});

describe('applyState set with mapping', () => {
  async function setWith(
    stored: Store.StoreValue | undefined,
    entry: Partial<Pick<State, 'value' | 'mapping'>>,
    event: WalkerOS.DeepPartialEvent = {
      name: 'order complete',
      user: { id: 'u1' },
      data: { ltv: 1840, segment: 'loyal', email: 'x@y' },
    },
  ) {
    const store = createMockStore();
    if (stored !== undefined) store.set('u1', stored);
    const collector = createMockCollector({ stores: { customers: store } });
    const getSpy = jest.spyOn(store, 'get');
    const out = await applyState(
      [
        {
          mode: 'set',
          store: 'customers',
          key: 'event.user.id',
          value: 'event.data',
          ...entry,
        },
      ],
      makeGetStore({ customers: store }),
      event,
      collector,
      {},
    );
    return { out, collector, store, getSpy };
  }

  test('merges the shaped payload into the stored entry', async () => {
    const { store } = await setWith(
      { ltv: 1, tier: 'gold' },
      { mapping: { map: { ltv: 'ltv', segment: 'segment' } } },
    );
    expect(await store.get('u1')).toEqual({
      ltv: 1840,
      tier: 'gold',
      segment: 'loyal',
    });
  });

  test('writes plainly when nothing is stored', async () => {
    const { store } = await setWith(undefined, {
      mapping: { map: { ltv: 'ltv', segment: 'segment' } },
    });
    expect(await store.get('u1')).toEqual({ ltv: 1840, segment: 'loyal' });
  });

  test('replaces a stored primitive and warns', async () => {
    const { store, collector } = await setWith('legacy', {
      mapping: { map: { ltv: 'ltv', segment: 'segment' } },
    });
    expect(await store.get('u1')).toEqual({ ltv: 1840, segment: 'loyal' });
    expect(collector.logger.warn).toHaveBeenCalledWith(
      '[state] stored value is not an object, replaced',
      { store: 'customers' },
    );
  });

  test('arrays replace, they do not concatenate', async () => {
    const { store } = await setWith(
      { tags: ['a'] },
      { mapping: { map: { tags: 'tags' } } },
      { name: 'order complete', user: { id: 'u1' }, data: { tags: ['b'] } },
    );
    expect(await store.get('u1')).toEqual({ tags: ['b'] });
  });

  test('a primitive result is written without reading first', async () => {
    const { store, getSpy } = await setWith(undefined, {
      value: 'event.data.ltv',
      mapping: { fn: (v) => (typeof v === 'number' ? v * 2 : undefined) },
    });
    expect(getSpy).not.toHaveBeenCalled();
    expect(store._data.get('u1')).toBe(3680);
  });

  test('an object payload with nothing picked writes nothing, silently', async () => {
    const { store, collector } = await setWith(
      { ltv: 1 },
      { mapping: { map: { missing: 'nope' } } },
    );
    expect(store._data.get('u1')).toEqual({ ltv: 1 });
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('a primitive payload with a path mapping writes nothing, silently', async () => {
    const { store, collector } = await setWith(undefined, {
      value: 'event.data.ltv',
      mapping: { map: { ltv: 'ltv' } },
    });
    expect(store._data.size).toBe(0);
    expect(collector.logger.warn).not.toHaveBeenCalled();
  });

  test('a fallback applies when the payload is undefined', async () => {
    const { store } = await setWith(undefined, {
      value: 'event.data.absent',
      mapping: { map: { segment: { key: 'segment', value: 'unknown' } } },
    });
    expect(store._data.get('u1')).toEqual({ segment: 'unknown' });
  });

  test('without mapping set is unchanged', async () => {
    const { store } = await setWith(undefined, { value: 'event.data.ltv' });
    expect(store._data.get('u1')).toBe(1840);
  });
});

describe('applyState store guards', () => {
  test('an unknown store logs an error and passes the event through', async () => {
    const collector = createMockCollector();
    const event = buildEvent();
    const out = await applyState(
      [
        {
          mode: 'get',
          store: 'nope',
          key: 'event.user.session',
          value: 'event.data.gclid',
        },
      ],
      () => undefined,
      event,
      collector,
      {},
    );
    expect(out).toEqual(event);
    expect(collector.logger.error).toHaveBeenCalledWith(
      '[state] unknown store',
      expect.objectContaining({ store: 'nope' }),
    );
  });

  test.each(['get', 'set'] as const)(
    'a file store is skipped with a warning (%s)',
    async (mode) => {
      const store = { ...createMockStore(), config: { file: true } };
      const buffer = Buffer.from('x');
      store.set('u1', buffer);
      const collector = createMockCollector({ stores: { files: store } });
      const event = {
        name: 'order complete',
        user: { id: 'u1' },
        data: { ltv: 1 },
      };
      const out = await applyState(
        [{ mode, store: 'files', key: 'event.user.id', value: 'event.data' }],
        makeGetStore({ files: store }),
        event,
        collector,
        {},
      );
      expect(out).toEqual(event);
      expect(store._data.get('u1')).toBe(buffer);
      expect(collector.logger.warn).toHaveBeenCalledWith(
        '[state] file stores are not supported by state, entry skipped',
        { mode, store: 'files' },
      );
    },
  );
});
