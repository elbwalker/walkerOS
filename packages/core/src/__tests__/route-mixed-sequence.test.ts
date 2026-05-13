import { compileNext, resolveNext } from '../route';

describe('compileNext — mixed sequence (string + RouteConfig array)', () => {
  it('compiles a mixed array to a sequence', () => {
    const compiled = compileNext([
      'a',
      {
        case: [
          {
            match: {
              key: 'event.name',
              operator: 'eq',
              value: 'order complete',
            },
            next: 'x',
          },
        ],
      },
    ]);
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('sequence');
    // sequence value is an array of CompiledNext segments
    if (compiled && compiled.type === 'sequence') {
      expect(Array.isArray(compiled.value)).toBe(true);
      expect(compiled.value).toHaveLength(2);
      expect(compiled.value[0].type).toBe('static');
      expect(compiled.value[1].type).toBe('case');
    }
  });

  it('resolves a sequence concatenating segment results when inner case matches', () => {
    const compiled = compileNext([
      'a',
      {
        case: [
          {
            match: {
              key: 'event.name',
              operator: 'eq',
              value: 'order complete',
            },
            next: 'x',
          },
        ],
      },
    ]);
    const resolved = resolveNext(compiled!, {
      event: { name: 'order complete' },
    });
    expect(resolved).toEqual(['a', 'x']);
  });

  it('resolves a sequence skipping undefined segments when inner case fails', () => {
    const compiled = compileNext([
      'a',
      {
        case: [
          {
            match: {
              key: 'event.name',
              operator: 'eq',
              value: 'order complete',
            },
            next: 'x',
          },
        ],
      },
    ]);
    const resolved = resolveNext(compiled!, {
      event: { name: 'page view' },
    });
    // Only "a" survives; inner case has no fallback so segment 2 → undefined
    expect(resolved).toEqual(['a']);
  });

  it('resolves a sequence with multiple mixed segments and chain target', () => {
    const compiled = compileNext([
      'dedup',
      {
        case: [
          {
            match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
            next: ['validate', 'enrich'],
          },
          { next: 'fallback' },
        ],
      },
      'writer',
    ]);
    expect(compiled!.type).toBe('sequence');

    const matched = resolveNext(compiled!, {
      ingest: { path: '/api/data' },
    });
    expect(matched).toEqual(['dedup', 'validate', 'enrich', 'writer']);

    const fallback = resolveNext(compiled!, {
      ingest: { path: '/other' },
    });
    expect(fallback).toEqual(['dedup', 'fallback', 'writer']);
  });

  it('still compiles a pure string array as chain (unchanged)', () => {
    const compiled = compileNext(['a', 'b']);
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('chain');
    if (compiled && compiled.type === 'chain') {
      expect(compiled.value).toEqual(['a', 'b']);
    }
    expect(resolveNext(compiled!)).toEqual(['a', 'b']);
  });

  it('still compiles a pure RouteConfig array as case (unchanged)', () => {
    const compiled = compileNext([
      {
        match: { key: 'event.name', operator: 'eq', value: 'page view' },
        next: 'page-handler',
      },
      { next: 'default' },
    ]);
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('case');
    expect(resolveNext(compiled!, { event: { name: 'page view' } })).toBe(
      'page-handler',
    );
    expect(resolveNext(compiled!, { event: { name: 'other' } })).toBe(
      'default',
    );
  });
});
