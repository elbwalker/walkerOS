import { advanceChain, isChainContinuation, startChain } from '../chain';
import * as packageIndex from '../index';
import type { Mapping } from '../types';
import {
  eq,
  interpret,
  makeTransformers,
  routeCases,
  visits,
} from '../examples/route-cases';

const rootsOf = routeCases.flatMap((routeCase) =>
  routeCase.roots.map((root, index) => ({
    name: `${routeCase.name} (root ${index})`,
    routeCase,
    root,
    expected: routeCase.expected[index],
  })),
);

describe('advanceChain', () => {
  it.each(rootsOf)('$name', ({ routeCase, root, expected }) => {
    expect(visits(interpret(routeCase, root))).toEqual(expected);
  });

  it('is done for an empty start', () => {
    expect(advanceChain(startChain(undefined), { ingest: {} }, {})).toEqual({
      kind: 'done',
    });
  });

  it('pushes the member next on top of rest, unresolved', () => {
    const transformers = makeTransformers({
      a: { match: eq('ingest.tier', 'gold'), next: 'vip' },
    });
    const step = advanceChain(
      startChain(['a', 'b']),
      { ingest: {} },
      transformers,
    );
    expect(step.kind).toBe('run');
    if (step.kind !== 'run') return;
    expect(step.id).toBe('a');
    expect(step.ancestry).toEqual(['a']);
    expect(step.rest[0]).toEqual({
      route: { match: eq('ingest.tier', 'gold'), next: 'vip' },
      ancestry: ['a'],
    });
  });

  it('resolves a conditional frame only when popped (laziness)', () => {
    // `a` writes the tier. An eager resolution of the gated `vip` segment
    // would see the root before `a` ran and skip it.
    const spec = ['a', { match: eq('ingest.tier', 'gold'), next: 'vip' }, 'z'];
    const root: Mapping.Root = { ingest: {} };
    const order: string[] = [];
    let step = advanceChain(startChain(spec), root, {});
    while (step.kind === 'run') {
      order.push(step.id);
      if (step.id === 'a') root.ingest = { tier: 'gold' };
      step = advanceChain(step.rest, root, {});
    }
    expect(order).toEqual(['a', 'vip', 'z']);
  });

  it('gives every fork branch its own copy of the enclosing stack', () => {
    // b's own next forks; the enclosing array (c, d) lives on the stack.
    const transformers = makeTransformers({ b: { many: ['m1', 'm2'] } });
    const root: Mapping.Root = { ingest: {} };
    let step = advanceChain(startChain(['b', 'c', 'd']), root, transformers);
    expect(step).toMatchObject({ kind: 'run', id: 'b' });
    if (step.kind !== 'run') return;
    step = advanceChain(step.rest, root, transformers);
    expect(step.kind).toBe('fork');
    if (step.kind !== 'fork') return;
    expect(step.branches).toHaveLength(2);
    const [first, second] = step.branches;
    expect(first.slice(1)).toEqual([
      { ids: ['b', 'c', 'd'], at: 1, ancestry: [] },
    ]);
    expect(second.slice(1)).toEqual(first.slice(1));
  });

  it('tells a continuation stack apart from a route', () => {
    expect(isChainContinuation(startChain(['a', 'b']))).toBe(true);
    expect(isChainContinuation(['a', 'b'])).toBe(false);
    expect(isChainContinuation([{ next: 'a' }, 'b'])).toBe(false);
    expect(isChainContinuation('a')).toBe(false);
  });

  it('is exported from the package index', () => {
    expect(packageIndex.advanceChain).toBe(advanceChain);
    expect(packageIndex.startChain).toBe(startChain);
  });
});
