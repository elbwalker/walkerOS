import type { Flow } from '@walkeros/core';
import { resolveComponent, type ComponentKind } from '../resolve';

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
  test.each<{ target: string; kind: ComponentKind; id: string; pkg: string }>([
    {
      target: 'destination.bigquery',
      kind: 'destination',
      id: 'bigquery',
      pkg: '@walkeros/server-destination-gcp/bigquery',
    },
    {
      target: 'source.http-in',
      kind: 'source',
      id: 'http-in',
      pkg: '@walkeros/server-source-express',
    },
    {
      target: 'store.cache',
      kind: 'store',
      id: 'cache',
      pkg: '@walkeros/store-memory',
    },
  ])('finds $kind by <kind>.<name>', ({ target, kind, id, pkg }) => {
    const r = resolveComponent(flow, target);
    expect(r).toMatchObject({ kind, id, packageName: pkg });
  });

  test.each([
    {
      name: 'invalid kind',
      target: 'transformer.foo',
      pattern: /Invalid kind/,
    },
    {
      name: 'unknown id with available list',
      target: 'destination.unknown',
      pattern: /not found.*bigquery/,
    },
    {
      name: 'bad syntax (no dot)',
      target: 'bigquery',
      pattern: /Invalid target/,
    },
  ])('throws on $name', ({ target, pattern }) => {
    expect(() => resolveComponent(flow, target)).toThrow(pattern);
  });
});
