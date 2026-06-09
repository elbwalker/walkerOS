import {
  compileCache,
  checkCache,
  storeCache,
  applyUpdate,
  buildCacheContext,
} from '../cache';
import { serializeStoreValue, deserializeStoreValue } from '../store/codec';
import {
  createMockCollector,
  createMockStore,
  createAsyncMockStore,
} from './helpers/mocks';
import type { Store } from '../types';

describe('compileCache', () => {
  it('compiles cache rules with matchers', () => {
    const compiled = compileCache({
      rules: [
        {
          match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
          key: ['ingest.method', 'ingest.path'],
          ttl: 300,
        },
      ],
    });
    expect(compiled).toBeDefined();
    expect(compiled.rules).toHaveLength(1);
  });

  it('preserves store reference', () => {
    const compiled = compileCache({
      store: 'redis',
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.storeId).toBe('redis');
  });

  it('defaults stop to false', () => {
    const compiled = compileCache({
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.stop).toBe(false);
  });

  it('preserves stop flag', () => {
    const compiled = compileCache({
      stop: true,
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.stop).toBe(true);
  });

  it('uses configured namespace when present', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      namespace: 'x',
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(compiled, store, {
      ingest: { path: '/api/data' },
    });

    expect(result).toBeDefined();
    expect(result!.key).toBe('x:/api/data');
  });

  it('writes keys directly without prefix when namespace omitted and runtime namespace omitted', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(compiled, store, {
      ingest: { path: '/api/data' },
    });

    expect(result).toBeDefined();
    expect(result!.key).toBe('/api/data');
  });

  it('treats missing match as always-match', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ key: ['ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(compiled, store, {
      ingest: { path: '/api/data' },
    });

    expect(result).toBeDefined();
    expect(result!.status).toBe('MISS');
    expect(result!.key).toBe('/api/data');
  });
});

describe('checkCache', () => {
  it('returns MISS when store has no entry', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(
      compiled,
      store,
      {
        ingest: { method: 'GET', path: '/api/data' },
      },
      'express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('MISS');
    expect(result!.key).toBe('express:GET:/api/data');
  });

  it('returns HIT when store has entry', async () => {
    // Covers readCacheEnvelope's live-value tolerance branch (a store returning
    // a non-enveloped live value), NOT the production HIT path; that is covered
    // by the byte-store round-trip tests in 'request-cache codec wiring'.
    const store = createMockStore();
    store._data.set('express:GET:/api/data', { body: 'cached' });

    const compiled = compileCache({
      rules: [{ key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(
      compiled,
      store,
      {
        ingest: { method: 'GET', path: '/api/data' },
      },
      'express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('HIT');
    expect(result!.value).toEqual({ body: 'cached' });
  });

  it('returns null when no rule matches', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [
        {
          match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
          key: ['ingest.path'],
          ttl: 60,
        },
      ],
    });
    const result = await checkCache(
      compiled,
      store,
      {
        ingest: { method: 'POST', path: '/api' },
      },
      't:enricher',
    );

    expect(result).toBeNull();
  });

  it('builds key from event fields', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ key: ['event.name'], ttl: 60 }],
    });
    const result = await checkCache(
      compiled,
      store,
      {
        event: { name: 'page view' },
      },
      'd:ga4',
    );

    expect(result).toBeDefined();
    expect(result!.key).toBe('d:ga4:page view');
  });

  it('returns null when key resolves to empty', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ key: ['ingest.nonexistent'], ttl: 60 }],
    });
    const result = await checkCache(compiled, store, { ingest: {} }, 'test');

    expect(result).toBeNull();
  });

  it('uses first matching rule', async () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [
        {
          match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
          key: ['ingest.path'],
          ttl: 300,
        },
        { key: ['ingest.method', 'ingest.path'], ttl: 60 },
      ],
    });
    const result = await checkCache(
      compiled,
      store,
      {
        ingest: { method: 'GET', path: '/api/data' },
      },
      'test',
    );

    // First rule matches — key uses only path (not method)
    expect(result!.key).toBe('test:/api/data');
  });

  it('awaits async store.get for HIT path', async () => {
    // Covers readCacheEnvelope's live-value tolerance branch (a store returning
    // a non-enveloped live value), NOT the production HIT path; that is covered
    // by the byte-store round-trip tests in 'request-cache codec wiring'.
    const store = createAsyncMockStore();
    store._data.set('express:GET:/api/data', { body: 'cached' });

    const compiled = compileCache({
      rules: [{ key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(
      compiled,
      store,
      { ingest: { method: 'GET', path: '/api/data' } },
      'express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('HIT');
    // Critical: value is the resolved object, not a Promise
    expect(result!.value).toEqual({ body: 'cached' });
  });

  it('awaits async store.get for MISS path', async () => {
    const store = createAsyncMockStore();

    const compiled = compileCache({
      rules: [{ key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = await checkCache(
      compiled,
      store,
      { ingest: { method: 'GET', path: '/api/data' } },
      'express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('MISS');
  });
});

describe('storeCache', () => {
  it('stores a structured envelope (not a Buffer) with TTL in milliseconds', () => {
    const store = createMockStore();
    const setSpy = jest.spyOn(store, 'set');

    storeCache(store, 'mykey', { data: 'value' }, 300);

    expect(setSpy).toHaveBeenCalledTimes(1);
    const [key, stored, ttlMs] = setSpy.mock.calls[0];
    expect(key).toBe('mykey');
    expect(ttlMs).toBe(300000);
    // The cache no longer pre-serializes to a Buffer; it stores a plain
    // {value, exp} envelope and lets the backing store serialize it.
    expect(Buffer.isBuffer(stored)).toBe(false);
    expect(stored).toEqual({
      __walkeros_cache_v__: { data: 'value' },
      __walkeros_cache_exp__: expect.any(Number),
    });
  });

  it('does not throw or leak an unhandled rejection when an async set rejects', async () => {
    const store: Store.Instance = {
      type: 'rejecting-mock',
      config: {},
      get: async () => undefined,
      set: () => Promise.reject(new Error('backend down')),
      delete: async () => undefined,
    };

    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on('unhandledRejection', onRejection);
    try {
      // Must not throw synchronously: the HTTP response is already sent.
      expect(() => storeCache(store, 'k', { status: 200 }, 60)).not.toThrow();
      // Flush the microtask queue (timers are faked in this suite, so a
      // real macrotask never fires). The rejection rides a real Promise, so
      // microtask turns are enough for an escaped rejection to surface.
      for (let i = 0; i < 5; i++) await Promise.resolve();
      expect(rejections).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onRejection);
    }
  });
});

describe('applyUpdate', () => {
  it('applies static values via setByPath', async () => {
    const result = await applyUpdate(
      { body: 'data', headers: {} },
      { 'headers.X-Cache': { value: 'HIT' } },
      {},
      createMockCollector(),
    );
    expect(result).toEqual({
      body: 'data',
      headers: { 'X-Cache': 'HIT' },
    });
  });

  it('resolves dynamic values from context via getMappingValue', async () => {
    const result = await applyUpdate(
      { body: 'data', headers: {} },
      { 'headers.X-Cache': { key: 'cache.status' } },
      { cache: { status: 'MISS' } },
      createMockCollector(),
    );
    expect(result).toEqual({
      body: 'data',
      headers: { 'X-Cache': 'MISS' },
    });
  });

  it('preserves existing fields', async () => {
    const result = await applyUpdate(
      { body: 'data', headers: { 'Content-Type': 'text/plain' } },
      { 'headers.X-Cache': { value: 'HIT' } },
      {},
      createMockCollector(),
    );
    expect(result).toEqual({
      body: 'data',
      headers: {
        'Content-Type': 'text/plain',
        'X-Cache': 'HIT',
      },
    });
  });

  it('returns value unchanged when no update rules', async () => {
    const original = { body: 'data' };
    const result = await applyUpdate(
      original,
      undefined,
      {},
      createMockCollector(),
    );
    expect(result).toEqual(original);
  });

  it('applies multiple update rules', async () => {
    const result = await applyUpdate(
      { headers: {} },
      {
        'headers.X-Cache': { value: 'HIT' },
        'headers.Cache-Control': { value: 'max-age=300' },
      },
      {},
      createMockCollector(),
    );
    expect(result).toEqual({
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'max-age=300',
      },
    });
  });
});

describe('buildCacheContext', () => {
  it('wraps ingest into context object', () => {
    const ctx = buildCacheContext({ method: 'GET', path: '/api' });
    expect(ctx).toEqual({ ingest: { method: 'GET', path: '/api' } });
  });

  it('wraps ingest and event', () => {
    const ctx = buildCacheContext({ method: 'GET' }, { name: 'page view' });
    expect(ctx).toEqual({
      ingest: { method: 'GET' },
      event: { name: 'page view' },
    });
  });

  it('defaults ingest to empty object when undefined', () => {
    const ctx = buildCacheContext(undefined);
    expect(ctx).toEqual({ ingest: {} });
  });

  it('defaults ingest to empty object when null', () => {
    const ctx = buildCacheContext(null);
    expect(ctx).toEqual({ ingest: {} });
  });

  it('omits event key when event is undefined', () => {
    const ctx = buildCacheContext({ path: '/' });
    expect(ctx).toEqual({ ingest: { path: '/' } });
    expect('event' in ctx).toBe(false);
  });
});

/**
 * A byte/JSON store that serializes every value through the shared store
 * codec, mirroring a real fs/s3/gcs backing. The cache stores a plain
 * {value, exp} envelope; this store serializes it, so binary leaves decode
 * back as platform-neutral `Uint8Array`, never a Node `Buffer`.
 */
function codecStore(): Store.Instance & { bytes: Map<string, Uint8Array> } {
  const bytes = new Map<string, Uint8Array>();
  return {
    type: 'mem-codec',
    config: { settings: {} },
    bytes,
    get: (k) => {
      const raw = bytes.get(k);
      return raw === undefined ? undefined : deserializeStoreValue(raw);
    },
    set: (k, v) => {
      bytes.set(k, serializeStoreValue(v));
    },
    delete: (k) => void bytes.delete(k),
  };
}

/** Recursively assert no Node `Buffer` survives in a decoded cache value. */
function assertNoBufferLeak(value: unknown): void {
  expect(Buffer.isBuffer(value)).toBe(false);
  if (value instanceof Uint8Array) return;
  if (Array.isArray(value)) {
    value.forEach(assertNoBufferLeak);
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(assertNoBufferLeak);
  }
}

describe('request-cache envelope wiring', () => {
  it('round-trips a response through a codec store (MISS then HIT)', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.method', 'ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { method: 'GET', path: '/walker.js' } };

    const miss = await checkCache(compiled, store, ctx);
    expect(miss?.status).toBe('MISS');

    const response = {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
      body: new Uint8Array(Buffer.from('var walkerOS = 1;')),
    };
    storeCache(store, miss!.key, response, miss!.rule.ttl);
    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual(response);
  });

  it('surfaces binary leaves as Uint8Array, never a Node Buffer', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/walker.js' } };
    const miss = await checkCache(compiled, store, ctx);

    const response = {
      status: 200,
      headers: {},
      body: new Uint8Array([0xff, 0x00, 0x80]),
      nested: [{ chunk: new Uint8Array([0x01, 0x02]) }],
    };
    storeCache(store, miss!.key, response, 3600);

    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    assertNoBufferLeak(hit?.value);
    expect(hit?.value).toEqual(response);
  });

  it('round-trips through an async codec store', async () => {
    const sync = codecStore();
    const store: Store.Instance = {
      type: 'mem-codec-async',
      config: { settings: {} },
      get: async (k) => sync.get(k),
      set: async (k, v) => void sync.set(k, v),
      delete: async (k) => void sync.delete(k),
    };
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/walker.js' } };
    const miss = await checkCache(compiled, store, ctx);
    const response = {
      status: 200,
      headers: {},
      body: new Uint8Array(Buffer.from('js')),
    };
    storeCache(store, miss!.key, response, 3600);
    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual(response);
  });

  it('expired entry reads as MISS and is purged', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: -1 }],
    });
    const ctx = { ingest: { path: '/x' } };
    const m = await checkCache(compiled, store, ctx);
    storeCache(store, m!.key, { status: 200 }, m!.rule.ttl);
    const again = await checkCache(compiled, store, ctx);
    expect(again?.status).toBe('MISS');
  });

  it('does not mistake a user object shaped like the envelope for one', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/x' } };
    const miss = await checkCache(compiled, store, ctx);
    // A user value that itself carries the envelope value key must round-trip
    // verbatim, not be unwrapped as an envelope.
    const value = { __walkeros_cache_v__: 'user-data', other: 1 };
    storeCache(store, miss!.key, value, 3600);
    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual(value);
  });

  // The storeCache gate (isStoreValue) must accept a value with an
  // undefined-valued property: JSON.stringify drops it, so it serializes
  // fine. Rejecting it would silently never cache RespondOptions/events that
  // carry optional-undefined fields (a stealth regression). The property is
  // dropped on round-trip, like JSON.
  it('caches a value with an undefined-valued property (dropped on round-trip, like JSON)', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/x' } };
    const miss = await checkCache(compiled, store, ctx);

    const respondOptions = { body: 'x', status: 200, headers: undefined };
    storeCache(store, miss!.key, respondOptions, 3600);

    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    // The undefined `headers` is dropped on serialize, matching JSON semantics.
    expect(hit?.value).toEqual({ body: 'x', status: 200 });
  });

  // An undefined array element serializes to null (JSON semantics), so it does
  // not disqualify the value at the gate.
  it('caches an array with an undefined element (element becomes null on round-trip)', async () => {
    const store = codecStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/x' } };
    const miss = await checkCache(compiled, store, ctx);

    const value = { items: ['a', undefined, 'c'] };
    storeCache(store, miss!.key, value, 3600);

    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual({ items: ['a', null, 'c'] });
  });
});
