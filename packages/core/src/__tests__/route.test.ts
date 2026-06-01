import {
  compileNext,
  resolveNext,
  isRouteArray,
  isRouteConfigEntry,
} from '../route';
import type {
  Route,
  RouteConfig,
  RouteOneConfig,
  RouteManyConfig,
} from '../types/transformer';

describe('compileNext', () => {
  it('returns undefined for undefined input', () => {
    expect(compileNext(undefined)).toBeUndefined();
  });

  it('compiles a static string', () => {
    const compiled = compileNext('enricher');
    expect(compiled).toBeDefined();
    expect(resolveNext(compiled!)).toBe('enricher');
  });

  it('compiles a static string array', () => {
    const compiled = compileNext(['a', 'b', 'c']);
    expect(compiled).toBeDefined();
    expect(resolveNext(compiled!)).toEqual(['a', 'b', 'c']);
  });

  it('compiles routes and resolves first match', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.path', operator: 'prefix', value: '/gtag' },
        next: 'gtag-parser',
      },
      { next: 'default' },
    ]);
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('one');
    expect(resolveNext(compiled!, { ingest: { path: '/gtag/collect' } })).toBe(
      'gtag-parser',
    );
    expect(resolveNext(compiled!, { ingest: { path: '/other' } })).toBe(
      'default',
    );
  });

  it('returns undefined when no route matches and no wildcard', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.method', operator: 'eq', value: 'POST' },
        next: 'writer',
      },
    ]);
    expect(
      resolveNext(compiled!, { ingest: { method: 'GET' } }),
    ).toBeUndefined();
  });

  it('resolves nested routes recursively', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
        next: [
          {
            match: { key: 'ingest.method', operator: 'eq', value: 'POST' },
            next: 'api-writer',
          },
          { next: 'api-reader' },
        ],
      },
      { next: 'default' },
    ]);
    expect(
      resolveNext(compiled!, { ingest: { path: '/api/data', method: 'POST' } }),
    ).toBe('api-writer');
    expect(
      resolveNext(compiled!, { ingest: { path: '/api/data', method: 'GET' } }),
    ).toBe('api-reader');
    expect(resolveNext(compiled!, { ingest: { path: '/other' } })).toBe(
      'default',
    );
  });

  it('resolves route target to string array (chain)', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.method', operator: 'eq', value: 'POST' },
        next: ['validator', 'writer'],
      },
      { next: 'reader' },
    ]);
    expect(resolveNext(compiled!, { ingest: { method: 'POST' } })).toEqual([
      'validator',
      'writer',
    ]);
  });

  it('handles complex match expressions (and/or)', () => {
    const compiled = compileNext([
      {
        match: {
          and: [
            { key: 'ingest.path', operator: 'prefix', value: '/api' },
            { key: 'ingest.method', operator: 'eq', value: 'POST' },
          ],
        },
        next: 'api-writer',
      },
      { next: 'default' },
    ]);
    expect(
      resolveNext(compiled!, { ingest: { path: '/api/data', method: 'POST' } }),
    ).toBe('api-writer');
    expect(
      resolveNext(compiled!, { ingest: { path: '/api/data', method: 'GET' } }),
    ).toBe('default');
  });

  it('resolves without context (static values pass through)', () => {
    const compiled = compileNext('enricher');
    expect(resolveNext(compiled!)).toBe('enricher');
  });

  it('matches against event fields', () => {
    const compiled = compileNext([
      {
        match: { key: 'event.name', operator: 'eq', value: 'page view' },
        next: 'page-handler',
      },
      { next: 'default' },
    ]);
    expect(resolveNext(compiled!, { event: { name: 'page view' } })).toBe(
      'page-handler',
    );
  });

  it('compiles a RouteConfig with explicit `one`', () => {
    const compiled = compileNext({
      one: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'order complete' },
          next: 'a',
        },
        { next: 'b' },
      ],
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('one');
    expect(resolveNext(compiled!, { event: { name: 'order complete' } })).toBe(
      'a',
    );
    expect(resolveNext(compiled!, { event: { name: 'page view' } })).toBe('b');
  });

  it('compiles a RouteConfig with `many` (all-match aggregation)', () => {
    const compiled = compileNext({
      many: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'order complete' },
          next: 'audit',
        },
        { next: 'always' },
        {
          match: { key: 'event.name', operator: 'eq', value: 'never' },
          next: 'skipped',
        },
      ],
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('many');
    expect(
      resolveNext(compiled!, { event: { name: 'order complete' } }),
    ).toEqual(['audit', 'always']);
    expect(resolveNext(compiled!, { event: { name: 'page view' } })).toEqual([
      'always',
    ]);
    expect(resolveNext(compiled!, { event: { name: 'never' } })).toEqual([
      'always',
      'skipped',
    ]);
  });

  it('compiles a gate-only RouteConfig', () => {
    const compiled = compileNext({
      match: { key: 'event.name', operator: 'eq', value: 'order complete' },
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('gate');
    // gate fails → resolveNext returns undefined (fall-through)
    expect(
      resolveNext(compiled!, { event: { name: 'page view' } }),
    ).toBeUndefined();
    // gate passes → resolveNext returns inner next (undefined here since gate has no next)
    expect(
      resolveNext(compiled!, { event: { name: 'order complete' } }),
    ).toBeUndefined();
  });

  it('compiles a gate-only RouteConfig with inner next propagation', () => {
    // A gate wraps an outer match around an inner case/next. When match passes,
    // resolveNext returns the inner next's value; when it fails, returns undefined.
    const compiled = compileNext({
      match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
      next: 'api-handler',
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('gate');
    expect(resolveNext(compiled!, { ingest: { path: '/api/data' } })).toBe(
      'api-handler',
    );
    expect(
      resolveNext(compiled!, { ingest: { path: '/other' } }),
    ).toBeUndefined();
  });

  // TODO: type-level test via tsd or similar — disjoint union is enforced by RouteConfig's `never` properties
});

describe('route shape predicates', () => {
  it('isRouteConfigEntry detects objects with match/next/one/many', () => {
    expect(
      isRouteConfigEntry({ match: { key: 'a', operator: 'eq', value: 'b' } }),
    ).toBe(true);
    expect(isRouteConfigEntry({ next: 'x' })).toBe(true);
    expect(isRouteConfigEntry({ one: ['a', 'b'] })).toBe(true);
    expect(isRouteConfigEntry({ many: ['a', 'b'] })).toBe(true);
  });

  it('isRouteConfigEntry rejects non-route shapes', () => {
    expect(isRouteConfigEntry('x')).toBe(false);
    expect(isRouteConfigEntry(['a', 'b'])).toBe(false);
    expect(isRouteConfigEntry({})).toBe(false);
    expect(isRouteConfigEntry(null)).toBe(false);
    expect(isRouteConfigEntry(undefined)).toBe(false);
  });

  it('isRouteArray detects pure RouteConfig arrays (legacy first-match)', () => {
    expect(
      isRouteArray([
        { match: { key: 'a', operator: 'eq', value: 'b' }, next: 'x' },
        { next: 'y' },
      ]),
    ).toBe(true);
  });

  it('isRouteArray rejects pure-string arrays and empty arrays', () => {
    expect(isRouteArray(['a', 'b'])).toBe(false);
    expect(isRouteArray([])).toBe(false);
    expect(isRouteArray('x')).toBe(false);
  });
});

describe('RouteConfig disjoint union surface', () => {
  it('typechecks RouteOneConfig and RouteManyConfig members', () => {
    const one: RouteOneConfig = {
      match: { key: 'event.name', operator: 'eq', value: 'page view' },
      one: ['handler-a', 'handler-b'],
    };
    const many: RouteManyConfig = { many: ['audit', 'process'] };
    const a: RouteConfig = one;
    const b: RouteConfig = many;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
});
