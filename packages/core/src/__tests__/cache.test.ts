import {
  compileCache,
  checkCache,
  storeCache,
  applyUpdate,
  buildCacheContext,
} from '../cache';
import type { Store } from '../types';
import { createMockCollector } from './helpers/mocks';

function createMockStore(): Store.Instance & { _data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    type: 'mock',
    config: {},
    _data: data,
    get: (key: string) => data.get(key),
    set: (key: string, value: unknown, ttl?: number) => {
      data.set(key, value);
    },
    delete: (key: string) => {
      data.delete(key);
    },
  };
}

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
      rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.storeId).toBe('redis');
  });

  it('defaults full to false', () => {
    const compiled = compileCache({
      rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.full).toBe(false);
  });

  it('preserves full flag', () => {
    const compiled = compileCache({
      full: true,
      rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
    });
    expect(compiled.full).toBe(true);
  });
});

describe('checkCache', () => {
  it('returns MISS when store has no entry', () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ match: '*', key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = checkCache(
      compiled,
      store,
      {
        ingest: { method: 'GET', path: '/api/data' },
      },
      's:express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('MISS');
    expect(result!.key).toBe('s:express:GET:/api/data');
  });

  it('returns HIT when store has entry', () => {
    const store = createMockStore();
    store._data.set('s:express:GET:/api/data', { body: 'cached' });

    const compiled = compileCache({
      rules: [{ match: '*', key: ['ingest.method', 'ingest.path'], ttl: 60 }],
    });
    const result = checkCache(
      compiled,
      store,
      {
        ingest: { method: 'GET', path: '/api/data' },
      },
      's:express',
    );

    expect(result).toBeDefined();
    expect(result!.status).toBe('HIT');
    expect(result!.value).toEqual({ body: 'cached' });
  });

  it('returns null when no rule matches', () => {
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
    const result = checkCache(
      compiled,
      store,
      {
        ingest: { method: 'POST', path: '/api' },
      },
      't:enricher',
    );

    expect(result).toBeNull();
  });

  it('builds key from event fields', () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ match: '*', key: ['event.name'], ttl: 60 }],
    });
    const result = checkCache(
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

  it('returns null when key resolves to empty', () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [{ match: '*', key: ['ingest.nonexistent'], ttl: 60 }],
    });
    const result = checkCache(compiled, store, { ingest: {} }, 'test');

    expect(result).toBeNull();
  });

  it('uses first matching rule', () => {
    const store = createMockStore();
    const compiled = compileCache({
      rules: [
        {
          match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
          key: ['ingest.path'],
          ttl: 300,
        },
        { match: '*', key: ['ingest.method', 'ingest.path'], ttl: 60 },
      ],
    });
    const result = checkCache(
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
});

describe('storeCache', () => {
  it('stores value with TTL in milliseconds', () => {
    const store = createMockStore();
    const setSpy = jest.spyOn(store, 'set');

    storeCache(store, 'mykey', { data: 'value' }, 300);

    expect(setSpy).toHaveBeenCalledWith('mykey', { data: 'value' }, 300000);
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
