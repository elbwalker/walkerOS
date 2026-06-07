import {
  compileCache,
  checkCache,
  storeCache,
  applyUpdate,
  buildCacheContext,
  encodeCacheValue,
  decodeCacheValue,
} from '../cache';
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
    // Covers decodeCacheValue's live-value tolerance branch (a store returning
    // a non-encoded live value), NOT the production HIT path; that is covered
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
    // Covers decodeCacheValue's live-value tolerance branch (a store returning
    // a non-encoded live value), NOT the production HIT path; that is covered
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
  it('stores an encoded Buffer with TTL in milliseconds', () => {
    const store = createMockStore();
    const setSpy = jest.spyOn(store, 'set');

    storeCache(store, 'mykey', { data: 'value' }, 300);

    expect(setSpy).toHaveBeenCalledTimes(1);
    const [key, encoded, ttlMs] = setSpy.mock.calls[0];
    expect(key).toBe('mykey');
    expect(ttlMs).toBe(300000);
    expect(Buffer.isBuffer(encoded)).toBe(true);
    expect(decodeCacheValue(encoded)).toEqual({ value: { data: 'value' } });
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

describe('cache value codec', () => {
  it('round-trips a RespondOptions object with a Buffer body', () => {
    const value = {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
      body: Buffer.from('var walkerOS = 1;'),
    };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({ value });
  });

  it('round-trips the boolean sentinel', () => {
    expect(decodeCacheValue(encodeCacheValue(true))).toEqual({ value: true });
  });

  it('round-trips a processed event object (transformer cache payload)', () => {
    const event = {
      name: 'page view',
      data: { id: '/x', count: 3 },
      nested: [],
    };
    expect(decodeCacheValue(encodeCacheValue(event))).toEqual({ value: event });
  });

  it('does not coerce a user object shaped like the marker', () => {
    const value = { note: { __walkeros_cache__: 'not-a-real-tag', d: 'x' } };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({ value });
  });

  it('does not mistake a user object for the envelope', () => {
    const value = { __walkeros_cache_v__: 'user-data', other: 1 };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({ value });
  });

  it('reports an expired entry as expired', () => {
    expect(decodeCacheValue(encodeCacheValue('x', -1))).toEqual({
      expired: true,
    });
  });

  it('treats undefined (missing) as undefined', () => {
    expect(decodeCacheValue(undefined)).toBeUndefined();
  });

  it('rehydrates a Buffer nested inside an escaped marker object', () => {
    const value = {
      __walkeros_cache__: 'user-supplied',
      items: [{ body: Buffer.from('payload') }],
    };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({ value });
  });

  it('decodes corrupt/non-envelope bytes as a miss', () => {
    expect(decodeCacheValue(Buffer.from([0x00, 0x01, 0x02]))).toBeUndefined();
    expect(decodeCacheValue(Buffer.from('not json'))).toBeUndefined();
    expect(decodeCacheValue(Buffer.from('{"x":1}'))).toBeUndefined();
  });

  it('round-trips a Uint8Array body to a byte-identical Buffer', () => {
    const value = { status: 200, body: new Uint8Array([0xff, 0x00, 0x80]) };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({
      value: { status: 200, body: Buffer.from([0xff, 0x00, 0x80]) },
    });
  });

  it('round-trips a Uint8Array view honoring byteOffset/length', () => {
    const full = new Uint8Array([0x01, 0xff, 0x00, 0x80, 0x02]);
    const view = full.subarray(1, 4); // [0xff, 0x00, 0x80]
    const value = { body: view };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({
      value: { body: Buffer.from([0xff, 0x00, 0x80]) },
    });
  });

  it('round-trips an ArrayBuffer body to a byte-identical Buffer', () => {
    const source = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const value = { body: source.buffer };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({
      value: { body: Buffer.from([0xde, 0xad, 0xbe, 0xef]) },
    });
  });

  it('round-trips an empty Uint8Array to an empty Buffer', () => {
    const value = { body: new Uint8Array([]) };
    expect(decodeCacheValue(encodeCacheValue(value))).toEqual({
      value: { body: Buffer.alloc(0) },
    });
  });
});

describe('request-cache codec wiring', () => {
  function byteStore(): Store.Instance {
    const map = new Map<string, Buffer>();
    return {
      type: 'mem-bytes',
      config: { settings: {} },
      get: (k) => map.get(k),
      set: (k, v) => {
        if (!Buffer.isBuffer(v)) throw new Error('byte store needs a Buffer');
        map.set(k, v);
      },
      delete: (k) => void map.delete(k),
    };
  }

  it('round-trips a Buffer-bodied response through a byte store (MISS then HIT)', async () => {
    const store = byteStore();
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
      body: Buffer.from('var walkerOS = 1;'),
    };
    storeCache(store, miss!.key, response, miss!.rule.ttl);
    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual(response);
  });

  function asyncByteStore(): Store.Instance {
    const map = new Map<string, Buffer>();
    return {
      type: 'mem-bytes-async',
      config: { settings: {} },
      get: async (k) => map.get(k),
      set: async (k, v) => {
        if (!Buffer.isBuffer(v)) throw new Error('byte store needs a Buffer');
        map.set(k, v);
      },
      delete: async (k) => void map.delete(k),
    };
  }

  it('decodes an encoded Buffer to a HIT through an async byte store', async () => {
    const store = asyncByteStore();
    const compiled = compileCache({
      stop: true,
      store: 'cache',
      rules: [{ key: ['ingest.path'], ttl: 3600 }],
    });
    const ctx = { ingest: { path: '/walker.js' } };
    const miss = await checkCache(compiled, store, ctx);
    const response = { status: 200, headers: {}, body: Buffer.from('js') };
    await store.set(miss!.key, encodeCacheValue(response, 3600_000), 3600_000);
    const hit = await checkCache(compiled, store, ctx);
    expect(hit?.status).toBe('HIT');
    expect(hit?.value).toEqual(response);
  });

  it('expired entry reads as MISS and is purged', async () => {
    const store = byteStore();
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
});
