import type { Mapping, Transformer } from '../types';
import type { MatchExpression } from '../types/matcher';
import { advanceChain, startChain } from '../chain';
import type { ChainContinuation } from '../chain';

/**
 * Shared route cases, exported from `@walkeros/core/dev` as `routeCases` so
 * every package tests its chain runner against the same cases. Each case is a start route, the member `next`s of the
 * transformers it can reach, a root set (every matcher passes for one root
 * and fails for another), and optional per-step ingest writes (what a step
 * leaves behind for the routes after it, e.g. `state` or a transformer).
 *
 * `expected[i]` lists, for `roots[i]`, the ids every copy visits in order;
 * a copy that ended on a stop ends with `STOP`.
 *
 * Reused by the chain tests, the resolver-vs-enumeration superset test and
 * the runtime/simulate parity tests.
 */
export const STOP = '(stop)';

export interface RouteCase {
  name: string;
  spec: Transformer.Route;
  nexts?: Record<string, Transformer.Route>;
  sets?: Record<string, Record<string, unknown>>;
  roots: Mapping.Root[];
  expected: string[][][];
}

export function eq(key: string, value: string): MatchExpression {
  return { key, operator: 'eq', value };
}

export function makeTransformers(
  nexts: Record<string, Transformer.Route> = {},
): Transformer.Transformers {
  const transformers: Transformer.Transformers = {};
  for (const [id, next] of Object.entries(nexts)) {
    transformers[id] = { type: id, config: { next }, push: () => undefined };
  }
  return transformers;
}

export const routeCases: RouteCase[] = [
  {
    name: 'static member next is inserted after the member',
    spec: ['bot', 'validate', 'session'],
    nexts: { bot: 'foo' },
    roots: [{ ingest: {} }],
    expected: [[['bot', 'foo', 'validate', 'session']]],
  },
  {
    name: 'member next insertion is recursive and depth first',
    spec: ['bot', 'validate', 'session'],
    nexts: { bot: 'foo', foo: 'bar' },
    roots: [{ ingest: {} }],
    expected: [[['bot', 'foo', 'bar', 'validate', 'session']]],
  },
  {
    name: 'conditional member next inserts only on match',
    spec: ['bot', 'validate'],
    nexts: { bot: { match: eq('ingest.bot', 'yes'), next: 'flag' } },
    roots: [{ ingest: { bot: 'yes' } }, { ingest: { bot: 'no' } }],
    expected: [[['bot', 'flag', 'validate']], [['bot', 'validate']]],
  },
  {
    name: 'conditional member next sees what the member wrote',
    spec: ['enrich', 'out'],
    nexts: { enrich: { match: eq('ingest.tier', 'gold'), next: 'vip' } },
    sets: { enrich: { tier: 'gold' } },
    roots: [{ ingest: {} }],
    expected: [[['enrich', 'vip', 'out']]],
  },
  {
    name: 'many forks and each fork finishes the rest of the array',
    spec: ['a', { many: ['x', 'y'] }, 'z'],
    roots: [{ ingest: {} }],
    expected: [
      [
        ['a', 'x', 'z'],
        ['a', 'y', 'z'],
      ],
    ],
  },
  {
    name: 'stop in one fork ends only that copy',
    spec: ['a', { many: [['x', { stop: true }], 'y'] }, 'z'],
    roots: [{ ingest: {} }],
    expected: [
      [
        ['a', 'x', STOP],
        ['a', 'y', 'z'],
      ],
    ],
  },
  {
    name: 'fork at depth 2 carries every enclosing continuation',
    spec: [
      'a',
      {
        one: [
          {
            match: eq('ingest.k', '1'),
            next: ['b', { many: ['c', 'd'] }, 'e'],
          },
        ],
      },
      'f',
    ],
    roots: [{ ingest: { k: '1' } }, { ingest: { k: '2' } }],
    expected: [
      [
        ['a', 'b', 'c', 'e', 'f'],
        ['a', 'b', 'd', 'e', 'f'],
      ],
      [['a', 'f']],
    ],
  },
  {
    name: 'fork inside a member next continues the enclosing arrays',
    spec: ['a', ['b', 'c'], 'd'],
    nexts: { b: { many: ['m1', 'm2'] } },
    roots: [{ ingest: {} }],
    expected: [
      [
        ['a', 'b', 'm1', 'c', 'd'],
        ['a', 'b', 'm2', 'c', 'd'],
      ],
    ],
  },
  {
    name: 'a step listed twice runs twice',
    spec: ['a', 'b', 'a'],
    roots: [{ ingest: {} }],
    expected: [[['a', 'b', 'a']]],
  },
  {
    name: 'member next cycle stops at the guard',
    spec: ['a', 'x'],
    nexts: { a: 'b', b: 'a' },
    roots: [{ ingest: {} }],
    expected: [[['a', 'b', 'x']]],
  },
  {
    name: 'gated stop after a write ends the copy',
    spec: ['a', { match: eq('ingest.tier', 'gold'), stop: true }, 'b'],
    sets: { a: { tier: 'gold' } },
    roots: [{ ingest: {} }],
    expected: [[['a', STOP]]],
  },
  {
    name: 'gated stop that fails falls through',
    spec: ['a', { match: eq('ingest.tier', 'gold'), stop: true }, 'b'],
    roots: [{ ingest: { tier: 'gold' } }, { ingest: { tier: 'silver' } }],
    // The gate is evaluated after `a` ran, with the root `a` left.
    expected: [[['a', STOP]], [['a', 'b']]],
  },
  {
    name: 'unconditional stop',
    spec: ['a', { stop: true }, 'b'],
    roots: [{ ingest: {} }],
    expected: [[['a', STOP]]],
  },
  {
    name: 'one with a stop entry',
    spec: { one: [{ match: eq('ingest.x', '1'), stop: true }, { next: 'b' }] },
    roots: [{ ingest: { x: '1' } }, { ingest: { x: '2' } }],
    expected: [[[STOP]], [['b']]],
  },
  {
    name: 'state get into ingest.tier → next one on ingest.tier',
    spec: [
      'state',
      {
        one: [
          { match: eq('ingest.tier', 'gold'), next: 'vip' },
          { next: 'std' },
        ],
      },
    ],
    sets: { state: { tier: 'gold' } },
    roots: [{ ingest: {} }],
    expected: [[['state', 'vip']]],
  },
];

export interface Copy {
  ids: string[];
  stopped: boolean;
  /** `from>to` for every hop, `from` empty at the head. */
  edges: string[];
}

function cloneRoot(root: Mapping.Root): Mapping.Root {
  return { ...root, ingest: { ...root.ingest } };
}

/**
 * Tiny pure interpreter: loops `advanceChain`, records the ids each copy
 * visits, applies the per-step ingest writes, runs forks as independent
 * copies. No transformer executes.
 */
export function interpret(
  routeCase: RouteCase,
  root: Mapping.Root,
  onRun?: (id: string) => void,
): Copy[] {
  const transformers = makeTransformers(routeCase.nexts);
  const copies: Copy[] = [];

  const run = (
    start: ChainContinuation,
    current: Mapping.Root,
    prefix: Copy,
  ): void => {
    let stack = start;
    const copy: Copy = {
      ids: [...prefix.ids],
      stopped: false,
      edges: [...prefix.edges],
    };
    for (let guard = 0; guard < 256; guard++) {
      const step = advanceChain(stack, current, transformers);
      if (step.kind === 'done') break;
      if (step.kind === 'stop') {
        copy.stopped = true;
        break;
      }
      if (step.kind === 'fork') {
        for (const branch of step.branches) {
          run(branch, cloneRoot(current), copy);
        }
        return;
      }
      if (onRun) onRun(step.id);
      const from = copy.ids.length > 0 ? copy.ids[copy.ids.length - 1] : '';
      copy.edges.push(`${from}>${step.id}`);
      copy.ids.push(step.id);
      const writes = routeCase.sets ? routeCase.sets[step.id] : undefined;
      if (writes) current.ingest = { ...current.ingest, ...writes };
      stack = step.rest;
    }
    copies.push(copy);
  };

  run(startChain(routeCase.spec), cloneRoot(root), {
    ids: [],
    stopped: false,
    edges: [],
  });
  return copies;
}

/** Visited ids per copy, `STOP` appended to stopped copies. */
export function visits(copies: Copy[]): string[][] {
  return copies.map((copy) => (copy.stopped ? [...copy.ids, STOP] : copy.ids));
}
