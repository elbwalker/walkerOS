import { compileRoute, getNextSteps } from '../route';
import type { NextSteps, RouteContinuation } from '../route';
import { createMappingRoot } from '../cache';
import * as packageIndex from '../index';
import type { Mapping } from '../types';
import type { Route } from '../types/transformer';
import { eq } from '../examples/route-cases';

const empty = createMappingRoot();
const withEvent = (name: string) => createMappingRoot({}, { name });

/** Follows `then` continuations to the end with one root. */
function resolveAll(
  spec: Route | RouteContinuation | undefined,
  root: Mapping.Root,
): string[] | 'stop' | 'fork' {
  const ids: string[] = [];
  let steps: NextSteps = getNextSteps(spec, root);
  for (;;) {
    if (steps.stop) return 'stop';
    if (steps.forks) return 'fork';
    ids.push(...steps.ids);
    if (!steps.then) return ids;
    steps = getNextSteps(steps.then, root);
  }
}

describe('getNextSteps', () => {
  it('returns no ids for an undefined spec', () => {
    expect(getNextSteps(undefined, empty)).toEqual({ ids: [] });
  });

  it('returns a single id for a string', () => {
    expect(getNextSteps('enricher', empty)).toEqual({ ids: ['enricher'] });
  });

  it('returns the ids of a static chain', () => {
    expect(getNextSteps(['a', 'b', 'c'], empty)).toEqual({
      ids: ['a', 'b', 'c'],
    });
  });

  it('returns the first match for `one`', () => {
    const spec: Route = {
      one: [
        { match: eq('event.name', 'page view'), next: 'page' },
        { next: 'default' },
      ],
    };
    expect(getNextSteps(spec, withEvent('page view'))).toEqual({
      ids: ['page'],
    });
    expect(getNextSteps(spec, withEvent('order'))).toEqual({
      ids: ['default'],
    });
  });

  it('forks every matching `many` entry', () => {
    const spec: Route = {
      many: [
        { match: eq('event.name', 'page view'), next: 'audit' },
        { next: 'always' },
        { match: eq('event.name', 'never'), next: 'skipped' },
      ],
    };
    const steps = getNextSteps(spec, withEvent('page view'));
    expect(steps.ids).toEqual([]);
    expect(steps.forks).toHaveLength(2);
    expect((steps.forks ?? []).map((fork) => resolveAll(fork, empty))).toEqual([
      ['audit'],
      ['always'],
    ]);
  });

  it('continues without a fork when exactly one `many` entry matches', () => {
    const spec: Route = {
      many: [
        { match: eq('ingest.x', 'A'), next: 'a' },
        { match: eq('ingest.x', 'B'), next: 'b' },
      ],
    };
    expect(getNextSteps(spec, createMappingRoot({ x: 'A' }))).toEqual({
      ids: ['a'],
    });
  });

  it('returns no ids for an empty many', () => {
    expect(getNextSteps({ many: [] }, empty)).toEqual({ ids: [] });
  });

  it('returns no ids when every many match fails', () => {
    const spec: Route = {
      many: [
        { match: eq('ingest.x', 'A'), next: 'a' },
        { match: eq('ingest.x', 'B'), next: 'b' },
      ],
    };
    expect(getNextSteps(spec, createMappingRoot({ x: 'Z' }))).toEqual({
      ids: [],
    });
  });

  it('gates `next` on the outer match', () => {
    const spec: Route = {
      match: { key: 'ingest.path', operator: 'prefix', value: '/api' },
      next: 'api',
    };
    expect(getNextSteps(spec, createMappingRoot({ path: '/api/x' }))).toEqual({
      ids: ['api'],
    });
    expect(getNextSteps(spec, createMappingRoot({ path: '/other' }))).toEqual({
      ids: [],
    });
  });

  it('forks a nested many inside one', () => {
    const spec: Route = {
      one: [
        { match: eq('event.name', 'order'), next: { many: ['a', 'b'] } },
        { next: 'default' },
      ],
    };
    const steps = getNextSteps(spec, withEvent('order'));
    expect((steps.forks ?? []).map((fork) => resolveAll(fork, empty))).toEqual([
      ['a'],
      ['b'],
    ]);
  });

  it('returns a mixed sequence up to its first conditional segment', () => {
    const spec: Route = [
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
    ];
    const api = createMappingRoot({ path: '/api/x' });
    const other = createMappingRoot({ path: '/other' });
    const steps = getNextSteps(spec, api);
    expect(steps.ids).toEqual(['dedup']);
    expect(steps.then).toBeDefined();
    expect(resolveAll(spec, api)).toEqual([
      'dedup',
      'validate',
      'enrich',
      'writer',
    ]);
    expect(resolveAll(spec, other)).toEqual(['dedup', 'fallback', 'writer']);
  });

  it('is exported from the package index', () => {
    expect(packageIndex.getNextSteps).toBe(getNextSteps);
  });
});

describe('getNextSteps stop', () => {
  const x1 = createMappingRoot({ x: '1' });
  const x2 = createMappingRoot({ x: '2' });

  it.each<{
    name: string;
    spec: Route;
    root: Mapping.Root;
    out: string[] | 'stop';
  }>([
    { name: 'unconditional stop', spec: { stop: true }, root: x1, out: 'stop' },
    {
      name: 'gated stop passes',
      spec: { match: eq('ingest.x', '1'), stop: true },
      root: x1,
      out: 'stop',
    },
    {
      name: 'gated stop fails and falls through',
      spec: [{ match: eq('ingest.x', '1'), stop: true }, 'b'],
      root: x2,
      out: ['b'],
    },
    {
      name: 'one: stop first',
      spec: { one: [{ stop: true }, { next: 'b' }] },
      root: x1,
      out: 'stop',
    },
    {
      name: 'one: stop after a match',
      spec: {
        one: [{ match: eq('ingest.x', '1'), next: ['a', { stop: true }] }],
      },
      root: x1,
      out: 'stop',
    },
    {
      name: 'one: failing-match stop falls through to the next entry',
      spec: {
        one: [{ match: eq('ingest.x', '1'), stop: true }, { next: 'b' }],
      },
      root: x2,
      out: ['b'],
    },
    {
      name: 'gate around stop',
      spec: { match: eq('ingest.x', '1'), next: { stop: true } },
      root: x1,
      out: 'stop',
    },
    {
      name: 'gate around stop, gate fails',
      spec: [{ match: eq('ingest.x', '1'), next: { stop: true } }, 'b'],
      root: x2,
      out: ['b'],
    },
    {
      name: 'nested next: { stop: true }',
      spec: { next: { next: { stop: true } } },
      root: x1,
      out: 'stop',
    },
    {
      name: "['a', { stop: true }] runs a, then stops",
      spec: ['a', { stop: true }],
      root: x1,
      out: 'stop',
    },
  ])('$name', ({ spec, root, out }) => {
    expect(resolveAll(spec, root)).toEqual(out);
  });

  it("['a', { stop: true }] returns a first, the stop only on resume", () => {
    const steps = getNextSteps(['a', { stop: true }], x1);
    expect(steps.ids).toEqual(['a']);
    expect(getNextSteps(steps.then, x1)).toEqual({ ids: [], stop: true });
  });

  it('many with a stop entry forks, and that fork stops alone', () => {
    const steps = getNextSteps({ many: [{ stop: true }, 'b'] }, x1);
    expect(steps.forks).toHaveLength(2);
    expect((steps.forks ?? []).map((fork) => resolveAll(fork, x1))).toEqual([
      'stop',
      ['b'],
    ]);
  });
});

describe('getNextSteps lazy sequences (R4)', () => {
  const gold = eq('ingest.tier', 'gold');

  it("['a', gate, 'b'] returns a plus a continuation", () => {
    const spec: Route = ['a', { match: gold, next: 'vip' }, 'b'];
    const steps = getNextSteps(spec, empty);
    expect(steps.ids).toEqual(['a']);
    expect(steps.then).toBeDefined();
    // Resolving `then` against the root `a` left gives that root's answer.
    expect(
      getNextSteps(steps.then, createMappingRoot({ tier: 'gold' })),
    ).toEqual({
      ids: ['vip', 'b'],
    });
    expect(getNextSteps(steps.then, empty)).toEqual({ ids: ['b'] });
  });

  it('[gate, b] resolves the gate now, its position is reached', () => {
    const spec: Route = [{ match: gold, next: 'vip' }, 'b'];
    expect(getNextSteps(spec, createMappingRoot({ tier: 'gold' }))).toEqual({
      ids: ['vip', 'b'],
    });
    expect(getNextSteps(spec, empty)).toEqual({ ids: ['b'] });
  });

  it('a one branch whose target is a sequence returns a continuation too', () => {
    const spec: Route = {
      one: [
        {
          match: eq('ingest.k', '1'),
          next: ['x', { match: gold, next: 'vip' }, 'y'],
        },
      ],
    };
    const steps = getNextSteps(spec, createMappingRoot({ k: '1' }));
    expect(steps.ids).toEqual(['x']);
    expect(
      getNextSteps(steps.then, createMappingRoot({ tier: 'gold' })),
    ).toEqual({
      ids: ['vip', 'y'],
    });
  });

  it('a continuation after a one branch still carries the outer remainder', () => {
    const spec: Route = [
      { one: [{ next: ['x', { match: gold, next: 'vip' }] }] },
      'z',
    ];
    const steps = getNextSteps(spec, empty);
    expect(steps.ids).toEqual(['x']);
    expect(getNextSteps(steps.then, empty)).toEqual({ ids: ['z'] });
  });
});

describe('getNextSteps compile cache', () => {
  it('compiles a spec object once', () => {
    const spec: Route = { many: ['a', 'b'] };
    expect(compileRoute(spec)).toBe(compileRoute(spec));
  });

  it('a continuation references the cached compiled nodes', () => {
    const spec: Route = ['a', { match: eq('ingest.x', '1'), next: 'b' }];
    const steps = getNextSteps(spec, empty);
    const compiled = compileRoute(spec);
    expect(compiled?.type).toBe('sequence');
    if (compiled?.type !== 'sequence') return;
    // `then` points into the cached sequence, no new compiled node.
    expect(steps.then?.segments).toBe(compiled.value);
    expect(steps.then?.at).toBe(1);
    expect(compileRoute(spec)).toBe(compiled);
  });
});
