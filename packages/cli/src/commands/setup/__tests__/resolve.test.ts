import type { Flow } from '@walkeros/core';
import { resolveComponent } from '../resolve';

const flow: Flow = {
  config: { platform: 'server' },
  sources: {
    'http-in': { package: '@walkeros/server-source-express', config: {} },
  },
  destinations: {
    bigquery: {
      package: '@walkeros/server-destination-gcp/bigquery',
      config: { settings: { projectId: 'p' } },
    },
  },
  stores: {
    cache: { package: '@walkeros/store-memory', config: {} },
  },
};

describe('resolveComponent', () => {
  test('finds destination by <kind>.<name>', () => {
    const r = resolveComponent(flow, 'destination.bigquery');
    expect(r.kind).toBe('destination');
    expect(r.id).toBe('bigquery');
    expect(r.packageName).toBe('@walkeros/server-destination-gcp/bigquery');
  });

  test('finds source', () => {
    const r = resolveComponent(flow, 'source.http-in');
    expect(r.kind).toBe('source');
  });

  test('finds store', () => {
    const r = resolveComponent(flow, 'store.cache');
    expect(r.kind).toBe('store');
  });

  test('throws on invalid kind', () => {
    expect(() => resolveComponent(flow, 'transformer.foo')).toThrow(
      /Invalid kind/,
    );
  });

  test('throws on unknown id with available list', () => {
    expect(() => resolveComponent(flow, 'destination.unknown')).toThrow(
      /not found.*bigquery/,
    );
  });

  test('throws on bad syntax', () => {
    expect(() => resolveComponent(flow, 'bigquery')).toThrow(/Invalid target/);
  });
});
