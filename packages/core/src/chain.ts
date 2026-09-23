import type { Mapping, Transformer } from './types';
import type { MatchExpression } from './types/matcher';
import type {
  CompiledIdNode,
  NextSteps,
  RouteContinuation,
  RouteDecision,
  RouteLabel,
} from './route';
import { enumerateRoute, getNextSteps, startRoute } from './route';

/**
 * One level of the continuation stack.
 *
 * - `ids` frame: resolved ids still to run, `at` is the next one.
 * - `route` frame: a route (or a route continuation) not resolved yet. It is
 *   resolved only when popped, i.e. with the root as the preceding step left
 *   it. A member's own `next` is pushed as a route frame right after the
 *   member runs.
 *
 * `ancestry` lists the members whose own `next` inserted this frame (outer
 * first). A member already in its frame's ancestry is not run again: that is
 * the cycle guard for member-next insertion. Frames of the explicit start
 * route have an empty ancestry, so a step listed twice runs twice.
 */
export type ChainFrame =
  | { ids: readonly string[]; at: number; ancestry: readonly string[] }
  | {
      route: Transformer.Route | RouteContinuation;
      ancestry: readonly string[];
    };

/**
 * Immutable continuation stack, top first. A fork copies it, so every copy
 * carries the continuation of every enclosing level.
 */
export type ChainContinuation = readonly ChainFrame[];

/**
 * What to do next.
 *
 * - `run`: run step `id`, then advance `rest` with the root the step left.
 *   `rest` already carries the member's own `next` on top (unresolved).
 *   `ancestry` is that frame's ancestry (member included), for a caller that
 *   pushes a further route on behalf of the member.
 * - `fork`: run every branch to its end as an independent copy.
 * - `stop`: this copy ends. `owner` is the member whose own route (its
 *   `next`, or a route pushed on its behalf) resolved the stop; absent when
 *   the stop came from the start route itself.
 * - `done`: the path is finished.
 */
export type ChainStep =
  | {
      kind: 'run';
      id: string;
      rest: ChainContinuation;
      ancestry: readonly string[];
    }
  | { kind: 'fork'; branches: ChainContinuation[] }
  | { kind: 'stop'; owner?: string }
  | { kind: 'done' };

/** Continuation stack for a chain field (`next`, `before`, ...). */
export function startChain(
  spec: Transformer.Route | undefined,
): ChainContinuation {
  return spec === undefined || spec === null
    ? []
    : [{ route: spec, ancestry: [] }];
}

/**
 * Tells a continuation stack apart from a Route. Route arrays hold ids,
 * nested routes and route configs, never frames; an empty array means
 * "nothing to run" either way.
 */
export function isChainContinuation(
  value: Transformer.Route | ChainContinuation,
): value is ChainContinuation {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        !Array.isArray(entry) &&
        'ancestry' in entry,
    )
  );
}

type IdsFrame = Extract<ChainFrame, { ids: readonly string[] }>;

type Popped =
  | {
      id: string;
      rest: ChainContinuation;
      ancestry: readonly string[];
    }
  | { id?: never; rest: ChainContinuation };

/**
 * Pops the next id of an ids frame. Applies the cycle guard and inserts the
 * member's own `next` right after it (depth first, unresolved).
 */
function popId(
  frame: IdsFrame,
  rest: ChainContinuation,
  transformers: Transformer.Transformers,
): Popped {
  if (frame.at >= frame.ids.length) return { rest };
  const id = frame.ids[frame.at];
  const remaining: ChainContinuation =
    frame.at + 1 < frame.ids.length
      ? [
          { ids: frame.ids, at: frame.at + 1, ancestry: frame.ancestry },
          ...rest,
        ]
      : rest;
  if (frame.ancestry.includes(id)) return { rest: remaining };

  const ancestry = [...frame.ancestry, id];
  const transformer = transformers[id];
  const memberNext = transformer ? transformer.config.next : undefined;
  return {
    id,
    ancestry,
    rest:
      memberNext === undefined
        ? remaining
        : [{ route: memberNext, ancestry }, ...remaining],
  };
}

type Expanded =
  | { kind: 'stack'; stack: ChainContinuation }
  | { kind: 'stop'; owner?: string }
  | { kind: 'fork'; branches: ChainContinuation[] };

/** Pushes a resolved route result onto the stack below it. */
function expand(
  steps: NextSteps,
  ancestry: readonly string[],
  rest: ChainContinuation,
): Expanded {
  if (steps.stop) {
    return ancestry.length > 0
      ? { kind: 'stop', owner: ancestry[ancestry.length - 1] }
      : { kind: 'stop' };
  }
  if (steps.forks) {
    return {
      kind: 'fork',
      branches: steps.forks.map((route) => [{ route, ancestry }, ...rest]),
    };
  }
  const stack: ChainFrame[] = [];
  if (steps.ids.length > 0) stack.push({ ids: steps.ids, at: 0, ancestry });
  if (steps.then) stack.push({ route: steps.then, ancestry });
  return { kind: 'stack', stack: [...stack, ...rest] };
}

/**
 * Advances the continuation stack to the next thing to do. Pure: no I/O and
 * no transformer execution. Route frames are resolved through
 * `getNextSteps` with `root`, only when popped.
 */
export function advanceChain(
  stack: ChainContinuation,
  root: Mapping.Root,
  transformers: Transformer.Transformers,
): ChainStep {
  let current = stack;
  while (current.length > 0) {
    const [top, ...rest] = current;
    if ('ids' in top) {
      const popped = popId(top, rest, transformers);
      if (popped.id !== undefined) {
        return {
          kind: 'run',
          id: popped.id,
          rest: popped.rest,
          ancestry: popped.ancestry,
        };
      }
      current = popped.rest;
      continue;
    }
    const expanded = expand(getNextSteps(top.route, root), top.ancestry, rest);
    if (expanded.kind !== 'stack') return expanded;
    current = expanded.stack;
  }
  return { kind: 'done' };
}

/**
 * One branch of the route graph: `targets` run in order right after `from`
 * (the position's head when `from` is absent). A branch ending in a `stop`
 * has `stop: true`.
 *
 * - `kind`, `match`, `catchAll`: the decision that selected the branch, with
 *   the SOURCE match expression (for labels and matcher path checks).
 * - `path`: position of that decision (or plain segment) inside the raw
 *   route; the route is the given spec, or `transformers[owner].config.next`
 *   when `owner` is set (an inserted member `next`).
 * - `via`: the enclosing decisions (outer first) that must also have held
 *   to reach this branch, e.g. the `one` entry around a nested gate. Absent
 *   when the branch sits directly under the route's head.
 */
export interface RouteGraphNode {
  from?: string;
  targets: string[];
  kind: RouteLabel['kind'];
  match?: MatchExpression;
  stop?: true;
  catchAll?: true;
  path: (string | number)[];
  owner?: string;
  via?: RouteDecision[];
}

/** The `outer` chain of a label as plain decisions, outer first. */
function decisionsAbove(label: RouteLabel): RouteDecision[] {
  const via: RouteDecision[] = [];
  for (let cur = label.outer; cur; cur = cur.outer) {
    const decision: RouteDecision = { kind: cur.kind, path: cur.path };
    if (cur.match) decision.match = cur.match;
    if (cur.catchAll) decision.catchAll = true;
    via.unshift(decision);
  }
  return via;
}

/**
 * Enumerates every branch of a route over the same compiled form and the
 * same continuation stack as `advanceChain`: every `one` and `many` entry,
 * both sides of a gate, sequence segments in order, stops marked. With
 * `transformers`, each member's own `next` is drawn where it is inserted,
 * and each fork continues through the rest of the path.
 */
export function getRouteGraph(
  spec: Transformer.Route | undefined,
  transformers: Transformer.Transformers = {},
): RouteGraphNode[] {
  const nodes: RouteGraphNode[] = [];
  const byKey = new Map<string, RouteGraphNode>();
  const seen = new Set<string>();
  const sources = new WeakMap<readonly string[], CompiledIdNode[]>();
  const uids = new WeakMap<object, number>();
  let counter = 0;
  const objectId = (value: object): number => {
    let id = uids.get(value);
    if (id === undefined) {
      id = ++counter;
      uids.set(value, id);
    }
    return id;
  };

  const ownerOf = (ancestry: readonly string[]): string | undefined =>
    ancestry.length > 0 ? ancestry[ancestry.length - 1] : undefined;

  const nodeFor = (
    from: string | undefined,
    label: RouteLabel,
    labelKey: number,
    owner: string | undefined,
    first: string | undefined,
  ): RouteGraphNode => {
    const stop = first === undefined;
    const key = `${from ?? ''}|${labelKey}|${owner ?? ''}|${first ?? ''}`;
    const existing = byKey.get(key);
    if (existing) return existing;
    const node: RouteGraphNode = {
      targets: [],
      kind: label.kind,
      path: label.path,
    };
    if (from !== undefined) node.from = from;
    if (label.match) node.match = label.match;
    if (label.catchAll) node.catchAll = true;
    if (stop) node.stop = true;
    if (owner !== undefined) node.owner = owner;
    if (label.outer) node.via = decisionsAbove(label);
    byKey.set(key, node);
    nodes.push(node);
    return node;
  };

  interface Open {
    node: RouteGraphNode;
    source: CompiledIdNode;
    position: number;
  }

  const frameKey = (frame: ChainFrame): string => {
    const ancestry = frame.ancestry.join(',');
    if ('ids' in frame) {
      const src = sources.get(frame.ids) ?? [];
      return `i${frame.ids.join(',')}#${src.map(objectId).join(',')}@${frame.at}/${ancestry}`;
    }
    const route = frame.route;
    if (typeof route === 'string') return `s${route}/${ancestry}`;
    let continuationKey = '';
    let cur: RouteContinuation | undefined = startRoute(route);
    while (cur) {
      continuationKey += `${objectId(cur.segments)}@${cur.at};`;
      cur = cur.tail;
    }
    return `r${continuationKey}/${ancestry}`;
  };

  const explore = (
    stack: ChainContinuation,
    from: string | undefined,
    open: Open | undefined,
  ): void => {
    const key = `${from ?? ''}|${open ? `${objectId(open.node)}:${open.position}` : ''}|${stack.map(frameKey).join('|')}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (stack.length === 0) return;

    const [top, ...rest] = stack;
    if ('ids' in top) {
      const popped = popId(top, rest, transformers);
      if (popped.id === undefined) {
        explore(popped.rest, from, open);
        return;
      }
      const src = (sources.get(top.ids) ?? [])[top.at];
      if (!src) return;
      let next: Open;
      if (
        open &&
        open.source === src &&
        open.node.targets[open.position] === from
      ) {
        const position = open.position + 1;
        if (open.node.targets.length === position) {
          open.node.targets.push(popped.id);
        }
        next = { node: open.node, source: src, position };
      } else {
        const node = nodeFor(
          from,
          src.label,
          objectId(src),
          ownerOf(top.ancestry),
          popped.id,
        );
        if (node.targets.length === 0) node.targets.push(popped.id);
        next = { node, source: src, position: 0 };
      }
      // A member's own next starts a new branch; so does anything but the
      // next id of the same compiled segment.
      explore(popped.rest, popped.id, next);
      return;
    }

    const owner = ownerOf(top.ancestry);
    for (const outcome of enumerateRoute(startRoute(top.route))) {
      const { steps } = outcome;
      const idSources: CompiledIdNode[] = [];
      // The id collected last in this resolution: where an empty branch sits.
      let last = from;
      for (const visited of outcome.visited) {
        if (visited.type === 'stop') {
          nodeFor(from, visited.label, objectId(visited), owner, undefined);
          continue;
        }
        if (visited.type === 'static') {
          idSources.push(visited);
          last = visited.value;
        } else if (visited.value.length === 0) {
          // A branch that selects nothing (bare gate, empty `one` or
          // `many`): drawn without targets.
          nodeFor(last, visited.label, objectId(visited), owner, '');
        } else {
          for (let i = 0; i < visited.value.length; i++)
            idSources.push(visited);
          last = visited.value[visited.value.length - 1];
        }
      }
      if (steps.ids.length > 0) sources.set(steps.ids, idSources);
      const expanded = expand(steps, top.ancestry, rest);
      if (expanded.kind === 'stop') continue;
      if (expanded.kind === 'fork') {
        for (const branch of expanded.branches)
          explore(branch, from, undefined);
        continue;
      }
      explore(expanded.stack, from, undefined);
    }
  };

  explore(startChain(spec), undefined, undefined);
  return nodes;
}
