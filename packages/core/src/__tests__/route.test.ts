import {
  compileNext,
  getNextSteps,
  isRouteArray,
  isRouteConfigEntry,
} from '../route';
import type { CompiledNext } from '../route';
import type { Mapping } from '../types';
import type {
  Route,
  RouteConfig,
  RouteOneConfig,
  RouteManyConfig,
} from '../types/transformer';

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

describe('compileNext', () => {
  it('returns undefined for undefined input', () => {
    expect(compileNext(undefined)).toBeUndefined();
  });

  it('compiles a static string', () => {
    const compiled = compileNext('enricher');
    expect(compiled).toBeDefined();
    expect(resolve(compiled)).toEqual(['enricher']);
  });

  it('compiles a static string array', () => {
    const compiled = compileNext(['a', 'b', 'c']);
    expect(compiled).toBeDefined();
    expect(resolve(compiled)).toEqual(['a', 'b', 'c']);
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
    expect(resolve(compiled, { ingest: { path: '/gtag/collect' } })).toEqual([
      'gtag-parser',
    ]);
    expect(resolve(compiled, { ingest: { path: '/other' } })).toEqual([
      'default',
    ]);
  });

  it('returns undefined when no route matches and no wildcard', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.method', operator: 'eq', value: 'POST' },
        next: 'writer',
      },
    ]);
    expect(resolve(compiled, { ingest: { method: 'GET' } })).toEqual([]);
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
      resolve(compiled, { ingest: { path: '/api/data', method: 'POST' } }),
    ).toEqual(['api-writer']);
    expect(
      resolve(compiled, { ingest: { path: '/api/data', method: 'GET' } }),
    ).toEqual(['api-reader']);
    expect(resolve(compiled, { ingest: { path: '/other' } })).toEqual([
      'default',
    ]);
  });

  it('resolves route target to string array (chain)', () => {
    const compiled = compileNext([
      {
        match: { key: 'ingest.method', operator: 'eq', value: 'POST' },
        next: ['validator', 'writer'],
      },
      { next: 'reader' },
    ]);
    expect(resolve(compiled, { ingest: { method: 'POST' } })).toEqual([
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
      resolve(compiled, { ingest: { path: '/api/data', method: 'POST' } }),
    ).toEqual(['api-writer']);
    expect(
      resolve(compiled, { ingest: { path: '/api/data', method: 'GET' } }),
    ).toEqual(['default']);
  });

  it('resolves without context (static values pass through)', () => {
    const compiled = compileNext('enricher');
    expect(resolve(compiled)).toEqual(['enricher']);
  });

  it('matches against event fields', () => {
    const compiled = compileNext([
      {
        match: { key: 'event.name', operator: 'eq', value: 'page view' },
        next: 'page-handler',
      },
      { next: 'default' },
    ]);
    expect(resolve(compiled, { event: { name: 'page view' } })).toEqual([
      'page-handler',
    ]);
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
    expect(resolve(compiled, { event: { name: 'order complete' } })).toEqual([
      'a',
    ]);
    expect(resolve(compiled, { event: { name: 'page view' } })).toEqual(['b']);
  });

  it('compiles a RouteConfig with `many` (all-match fan-out)', () => {
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
    // Two or more matches fork; a single match continues in place.
    expect(resolve(compiled, { event: { name: 'order complete' } })).toBe(
      'fork',
    );
    expect(resolve(compiled, { event: { name: 'page view' } })).toEqual([
      'always',
    ]);
  });

  it('compiles a stop, gated or not', () => {
    expect(compileNext({ stop: true })?.type).toBe('stop');
    const gated = compileNext({
      match: { key: 'ingest.x', operator: 'eq', value: '1' },
      stop: true,
    });
    expect(gated?.type).toBe('gate');
    expect(resolve(gated, { ingest: { x: '1' } })).toBe('stop');
    expect(resolve(gated, { ingest: { x: '2' } })).toEqual([]);
  });

  it('keeps the source match expression beside the compiled matcher', () => {
    const match = { key: 'event.name', operator: 'eq' as const, value: 'a' };
    const gate = compileNext({ match, next: 'x' });
    expect(gate?.type === 'gate' && gate.source).toBe(match);
    const one = compileNext({ one: [{ match, next: 'x' }, 'y'] });
    expect(one?.type === 'one' && one.routes.map((r) => r.source)).toEqual([
      match,
      undefined,
    ]);
  });

  it('compiles a gate-only RouteConfig', () => {
    const compiled = compileNext({
      match: { key: 'event.name', operator: 'eq', value: 'order complete' },
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('gate');
    // gate fails: falls through, no ids
    expect(resolve(compiled, { event: { name: 'page view' } })).toEqual([]);
    // gate passes: a bare gate selects nothing either
    expect(resolve(compiled, { event: { name: 'order complete' } })).toEqual(
      [],
    );
  });

  it('compiles a gate-only RouteConfig with inner next propagation', () => {
    // A gate wraps an outer match around an inner case/next. When match passes,
    // Passing resolves the inner next; failing falls through with no ids.
    const compiled = compileNext({
      match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
      next: 'api-handler',
    });
    expect(compiled).toBeDefined();
    expect(compiled!.type).toBe('gate');
    expect(resolve(compiled, { ingest: { path: '/api/data' } })).toEqual([
      'api-handler',
    ]);
    expect(resolve(compiled, { ingest: { path: '/other' } })).toEqual([]);
  });

  // TODO: type-level test via tsd or similar — disjoint union is enforced by RouteConfig's `never` properties
});

describe('route shape predicates', () => {
  it('isRouteConfigEntry detects objects with match/next/one/many/stop', () => {
    expect(
      isRouteConfigEntry({ match: { key: 'a', operator: 'eq', value: 'b' } }),
    ).toBe(true);
    expect(isRouteConfigEntry({ next: 'x' })).toBe(true);
    expect(isRouteConfigEntry({ one: ['a', 'b'] })).toBe(true);
    expect(isRouteConfigEntry({ many: ['a', 'b'] })).toBe(true);
    expect(isRouteConfigEntry({ stop: true })).toBe(true);
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
