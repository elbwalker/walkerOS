import { compileNext, resolveNext } from '../route';

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
    expect(compiled!.type).toBe('case');
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

  it('compiles a RouteConfig with explicit case', () => {
    const compiled = compileNext({
      case: [
        {
          match: { key: 'event.name', operator: 'eq', value: 'order complete' },
          next: 'a',
        },
        { next: 'b' },
      ],
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('case');
    expect(resolveNext(compiled!, { event: { name: 'order complete' } })).toBe(
      'a',
    );
    expect(resolveNext(compiled!, { event: { name: 'page view' } })).toBe('b');
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
