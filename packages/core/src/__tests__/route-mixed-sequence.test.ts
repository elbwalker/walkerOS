import { compileNext, getNextSteps } from '../route';
import type { CompiledNext } from '../route';
import type { Mapping } from '../types';

/** Resolves a compiled node to the end with one root (ids, 'stop' or 'fork'). */
function resolve(
  compiled: CompiledNext | undefined,
  partial: Partial<Mapping.Root> = {},
): string[] | 'stop' | 'fork' {
  const root: Mapping.Root = { ingest: {}, ...partial };
  const ids: string[] = [];
  let steps = getNextSteps(
    compiled
      ? { type: 'continuation', segments: [compiled], at: 0 }
      : undefined,
    root,
  );
  for (;;) {
    if (steps.stop) return 'stop';
    if (steps.forks) return 'fork';
    ids.push(...steps.ids);
    if (!steps.then) return ids;
    steps = getNextSteps(steps.then, root);
  }
}

describe('compileNext — mixed sequence (string + RouteConfig array)', () => {
  it('compiles a mixed array to a sequence', () => {
    const compiled = compileNext([
      'a',
      {
        one: [
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
      expect(compiled.value[1].type).toBe('one');
    }
  });

  it('resolves a sequence concatenating segment results when inner one matches', () => {
    const compiled = compileNext([
      'a',
      {
        one: [
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
    const resolved = resolve(compiled, {
      event: { name: 'order complete' },
    });
    expect(resolved).toEqual(['a', 'x']);
  });

  it('resolves a sequence skipping undefined segments when inner one fails', () => {
    const compiled = compileNext([
      'a',
      {
        one: [
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
    const resolved = resolve(compiled, {
      event: { name: 'page view' },
    });
    // Only "a" survives: the inner one has no fallback and falls through.
    expect(resolved).toEqual(['a']);
  });

  it('resolves a sequence with multiple mixed segments and chain target', () => {
    const compiled = compileNext([
      'dedup',
      {
        one: [
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

    const matched = resolve(compiled, {
      ingest: { path: '/api/data' },
    });
    expect(matched).toEqual(['dedup', 'validate', 'enrich', 'writer']);

    const fallback = resolve(compiled, {
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
    expect(resolve(compiled)).toEqual(['a', 'b']);
  });

  it('still compiles a pure RouteConfig array as one (unchanged)', () => {
    const compiled = compileNext([
      {
        match: { key: 'event.name', operator: 'eq', value: 'page view' },
        next: 'page-handler',
      },
      { next: 'default' },
    ]);
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('one');
    expect(resolve(compiled, { event: { name: 'page view' } })).toEqual([
      'page-handler',
    ]);
    expect(resolve(compiled, { event: { name: 'other' } })).toEqual([
      'default',
    ]);
  });
});
