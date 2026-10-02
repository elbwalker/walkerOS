import { getRouteGraph } from '../chain';
import type { RouteGraphNode } from '../chain';
import { compileRoute, getNextSteps } from '../route';
import * as packageIndex from '../index';
import type { Route } from '../types/transformer';
import {
  eq,
  interpret,
  makeTransformers,
  routeCases,
} from '../examples/route-cases';

/** Every `from>to` hop the graph draws; `from` is empty at the head. */
function graphEdges(nodes: RouteGraphNode[]): Set<string> {
  const edges = new Set<string>();
  for (const node of nodes) {
    let from = node.from ?? '';
    for (const target of node.targets) {
      edges.add(`${from}>${target}`);
      from = target;
    }
  }
  return edges;
}

const strip = (nodes: RouteGraphNode[]) =>
  nodes.map(({ from, targets, kind, stop, owner }) => ({
    from,
    targets,
    kind,
    stop,
    owner,
  }));

describe('getRouteGraph', () => {
  const m1 = eq('ingest.k', '1');
  const m2 = eq('ingest.k', '2');

  it('draws a static chain as one branch', () => {
    expect(getRouteGraph(['a', 'b', 'c'])).toEqual([
      { targets: ['a', 'b', 'c'], kind: 'next', path: [] },
    ]);
  });

  it('draws every one entry with its source match, path and catch-all', () => {
    const spec: Route = {
      one: [{ match: m1, next: ['x', 'y'] }, { match: m2, next: 'z' }, 'w'],
    };
    expect(getRouteGraph(spec)).toEqual([
      { targets: ['x', 'y'], kind: 'one', match: m1, path: ['one', 0] },
      { targets: ['z'], kind: 'one', match: m2, path: ['one', 1] },
      { targets: ['w'], kind: 'one', catchAll: true, path: ['one', 2] },
    ]);
  });

  it('draws every many entry', () => {
    const graph = getRouteGraph({ many: [{ match: m1, next: 'x' }, 'y'] });
    expect(graph).toEqual([
      { targets: ['x'], kind: 'many', match: m1, path: ['many', 0] },
      { targets: ['y'], kind: 'many', catchAll: true, path: ['many', 1] },
    ]);
  });

  it('draws both sides of a gate and sequence order', () => {
    const graph = getRouteGraph(['a', { match: m1, next: 'g' }, 'b']);
    expect(graph).toEqual([
      { targets: ['a'], kind: 'sequence', path: [0] },
      { from: 'a', targets: ['g'], kind: 'next', match: m1, path: [1] },
      { from: 'g', targets: ['b'], kind: 'sequence', path: [2] },
      { from: 'a', targets: ['b'], kind: 'sequence', path: [2] },
    ]);
  });

  it('marks stops, gated and unconditional', () => {
    const graph = getRouteGraph([
      'a',
      { match: m1, stop: true },
      'b',
      { stop: true },
    ]);
    expect(strip(graph)).toEqual([
      { targets: ['a'], kind: 'sequence' },
      { from: 'a', targets: [], kind: 'next', stop: true },
      { from: 'a', targets: ['b'], kind: 'sequence' },
      { from: 'b', targets: [], kind: 'sequence', stop: true },
    ]);
    expect(graph[1].match).toEqual(m1);
    expect(graph[1].path).toEqual([1]);
  });

  it('points path at the raw position of nested next', () => {
    const graph = getRouteGraph({
      one: [{ match: m1, next: { match: m2, next: 'deep' } }],
    });
    expect(graph).toEqual([
      {
        targets: ['deep'],
        kind: 'next',
        match: m2,
        path: ['one', 0, 'next'],
        via: [{ kind: 'one', match: m1, path: ['one', 0] }],
      },
    ]);
  });

  it('lists every enclosing decision in via, outer first', () => {
    const graph = getRouteGraph({
      match: m1,
      one: [{ match: m2, many: ['x', { match: m1, stop: true }] }],
    });
    const outer = [
      { kind: 'next', match: m1, path: [] },
      { kind: 'one', match: m2, path: ['one', 0] },
    ];
    expect(graph).toEqual(
      expect.arrayContaining([
        {
          targets: ['x'],
          kind: 'many',
          catchAll: true,
          path: ['one', 0, 'many', 0],
          via: outer,
        },
        {
          targets: [],
          kind: 'many',
          match: m1,
          stop: true,
          path: ['one', 0, 'many', 1],
          via: outer,
        },
      ]),
    );
  });

  it('draws an empty one or many as a branch without targets', () => {
    expect(getRouteGraph({ many: [] })).toEqual([
      { targets: [], kind: 'many', path: ['many'] },
    ]);
    const graph = getRouteGraph(['a', { one: [] }, 'b']);
    expect(graph).toHaveLength(3);
    expect(graph).toEqual(
      expect.arrayContaining([
        { targets: ['a'], kind: 'sequence', path: [0] },
        { from: 'a', targets: [], kind: 'one', path: [1, 'one'] },
        { from: 'a', targets: ['b'], kind: 'sequence', path: [2] },
      ]),
    );
  });

  it('draws a bare gate as a branch without targets', () => {
    expect(getRouteGraph({ match: m1 })).toEqual([
      { targets: [], kind: 'next', match: m1, path: [] },
    ]);
  });

  it('draws member-next insertion: bot → foo → validate', () => {
    const graph = getRouteGraph(
      ['bot', 'validate', 'session'],
      makeTransformers({ bot: 'foo' }),
    );
    expect(strip(graph)).toEqual([
      { targets: ['bot'], kind: 'next' },
      { from: 'bot', targets: ['foo'], kind: 'next', owner: 'bot' },
      { from: 'foo', targets: ['validate', 'session'], kind: 'next' },
    ]);
  });

  it('continues each fork through the rest of the array', () => {
    const edges = graphEdges(getRouteGraph(['a', { many: ['x', 'y'] }, 'z']));
    // Both entries are catch-alls, so `a` never reaches `z` directly.
    expect([...edges].sort()).toEqual(
      ['>a', 'a>x', 'a>y', 'x>z', 'y>z'].sort(),
    );
  });

  it('reuses the cached compiled node', () => {
    const spec: Route = ['a', { match: m1, next: 'b' }];
    getNextSteps(spec, { ingest: {} });
    const compiled = compileRoute(spec);
    getRouteGraph(spec);
    expect(compileRoute(spec)).toBe(compiled);
  });

  it('is exported from the package index', () => {
    expect(packageIndex.getRouteGraph).toBe(getRouteGraph);
  });
});

describe('resolver ⊆ enumeration', () => {
  const cases = routeCases.flatMap((routeCase) =>
    routeCase.roots.map((root, index) => ({
      name: `${routeCase.name} (root ${index})`,
      routeCase,
      root,
    })),
  );

  it.each(cases)('$name', ({ routeCase, root }) => {
    const graph = getRouteGraph(
      routeCase.spec,
      makeTransformers(routeCase.nexts),
    );
    const edges = graphEdges(graph);
    const targets = new Set(graph.flatMap((node) => node.targets));
    const copies = interpret(routeCase, root);
    for (const copy of copies) {
      for (const id of copy.ids) expect(targets).toContain(id);
      for (const edge of copy.edges) expect(edges).toContain(edge);
      if (copy.stopped) {
        const last =
          copy.ids.length > 0 ? copy.ids[copy.ids.length - 1] : undefined;
        expect(graph.some((node) => node.stop && node.from === last)).toBe(
          true,
        );
      }
    }
  });
});
