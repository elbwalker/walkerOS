import type { Mapping } from './types';
import type { Route, RouteConfig } from './types/transformer';
import type { CompiledMatcher, MatchExpression } from './types/matcher';
import { compileMatcher } from './matcher';

/** Position inside a raw route spec, e.g. `['one', 0, 'next']`. */
export type RoutePath = (string | number)[];

/**
 * Where a compiled id or stop came from: the nearest enclosing decision
 * (`one` / `many` entry or gated `next` / `stop`) with its SOURCE match
 * expression, or, outside any decision, the plain position of the segment.
 * Kept beside the compiled matcher so enumerations can label branches.
 */
export interface RouteDecision {
  kind: 'next' | 'one' | 'many' | 'sequence';
  path: RoutePath;
  match?: MatchExpression;
  catchAll?: true;
}

/**
 * A decision label plus `outer`, the enclosing decision whose match must
 * also have held to reach this one (a gate inside a `one` entry, a `one`
 * inside a gate, ...). The chain of `outer` links lists every decision on
 * the way from the route's head.
 */
export interface RouteLabel extends RouteDecision {
  outer?: RouteLabel;
}

/**
 * Internal: compiled route data. Not exported from the package's public
 * surface (`@walkeros/core`), but exported here so adjacent files inside the
 * core package can probe compilation.
 */
export interface CompiledRoute {
  match: CompiledMatcher;
  source?: MatchExpression;
  next: CompiledNext;
}

export type CompiledIdNode =
  | { type: 'static'; value: string; label: RouteLabel }
  | { type: 'chain'; value: string[]; label: RouteLabel };

export type CompiledStopNode = { type: 'stop'; label: RouteLabel };

export type CompiledGateNode = {
  type: 'gate';
  match: CompiledMatcher;
  source: MatchExpression;
  next: CompiledNext;
};

export type CompiledNext =
  | CompiledIdNode
  | CompiledStopNode
  | CompiledGateNode
  | { type: 'one'; routes: CompiledRoute[] }
  | { type: 'many'; routes: CompiledRoute[] }
  | { type: 'sequence'; value: CompiledNext[] };

/**
 * The unresolved remainder of a route: compiled segments still to walk,
 * followed by the remainder of every enclosing level (`tail`). Treat it as
 * opaque: only `getNextSteps` (and the chain helpers built on it) read it.
 * It references the cached compiled nodes, so resuming never recompiles.
 */
export interface RouteContinuation {
  readonly type: 'continuation';
  readonly segments: readonly CompiledNext[];
  readonly at: number;
  readonly tail?: RouteContinuation;
}

/**
 * Result of resolving a route against one root.
 *
 * - `{ ids }`: run these ids in order. `ids: []` without `then` means the
 *   route resolved to nothing (gate failed, no `one` entry matched, empty or
 *   undefined spec): the caller continues with whatever follows the route.
 * - `{ ids, then }`: run `ids`, then resolve `then` against the root as the
 *   last of those steps left it (lazy sequences).
 * - `{ ids: [], stop: true }`: a `stop` matched; the running copy ends.
 * - `{ ids: [], forks }`: a `many` matched two or more entries. Each fork is
 *   an independent copy that resolves its own continuation (which already
 *   includes the rest of the enclosing sequence).
 */
export type NextSteps =
  | {
      ids: string[];
      then?: RouteContinuation;
      stop?: never;
      forks?: never;
    }
  | { ids: []; stop: true; then?: never; forks?: never }
  | { ids: []; forks: RouteContinuation[]; stop?: never; then?: never };

export function isRouteConfigEntry(entry: unknown): boolean {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    !Array.isArray(entry) &&
    ('match' in entry ||
      'next' in entry ||
      'one' in entry ||
      'many' in entry ||
      'stop' in entry)
  );
}

/**
 * Pure RouteConfig array: every element is a RouteConfig object.
 * Used to detect the legacy first-match shape (treated as implicit `one`).
 */
export function isRouteArray(next: Route): next is RouteConfig[] {
  return (
    Array.isArray(next) &&
    next.length > 0 &&
    next.every((entry) => isRouteConfigEntry(entry))
  );
}

export function isRouteContinuation(
  spec: Route | RouteContinuation,
): spec is RouteContinuation {
  return (
    typeof spec === 'object' &&
    !Array.isArray(spec) &&
    'type' in spec &&
    spec.type === 'continuation'
  );
}

const always: CompiledMatcher = () => true;

function plainLabel(path: RoutePath, inSequence: boolean): RouteLabel {
  return { kind: inSequence ? 'sequence' : 'next', path };
}

/** `label` with `outer` attached when there is an enclosing decision. */
function withOuter(
  label: RouteLabel,
  outer: RouteLabel | undefined,
): RouteLabel {
  return outer ? { ...label, outer } : label;
}

function entryLabel(
  kind: 'one' | 'many',
  path: RoutePath,
  match: MatchExpression | undefined,
  outer: RouteLabel | undefined,
): RouteLabel {
  return withOuter(
    match ? { kind, path, match } : { kind, path, catchAll: true },
    outer,
  );
}

/**
 * A `one` or `many` list. An empty list selects nothing and continues, like
 * a bare gate; it compiles to an empty id node so enumeration still draws
 * the decision (without targets).
 */
function compileEntries(
  entries: Route[],
  basePath: RoutePath,
  kind: 'one' | 'many',
  outer: RouteLabel | undefined,
): CompiledNext {
  if (entries.length === 0) {
    return {
      type: 'chain',
      value: [],
      label: withOuter({ kind, path: basePath }, outer),
    };
  }
  return { type: kind, routes: compileRoutes(entries, basePath, kind, outer) };
}

function compileRoutes(
  entries: Route[],
  basePath: RoutePath,
  kind: 'one' | 'many',
  outer: RouteLabel | undefined,
): CompiledRoute[] {
  return entries.map((entry, i) => {
    const path = [...basePath, i];
    if (typeof entry === 'string' || Array.isArray(entry)) {
      const label = entryLabel(kind, path, undefined, outer);
      return {
        match: always,
        next: compileNext(entry, path, label) ?? {
          type: 'chain',
          value: [],
          label,
        },
      };
    }
    const label = entryLabel(kind, path, entry.match, outer);
    return {
      match: entry.match ? compileMatcher(entry.match) : always,
      source: entry.match,
      next: compileConfig(entry, path, label, false, true) ?? {
        type: 'chain',
        value: [],
        label,
      },
    };
  });
}

function compileConfig(
  cfg: RouteConfig,
  path: RoutePath,
  outer: RouteLabel | undefined,
  inSequence: boolean,
  matchHandled: boolean,
): CompiledNext | undefined {
  const source = matchHandled ? undefined : cfg.match;
  const own: RouteLabel = source
    ? withOuter({ kind: 'next', path, match: source }, outer)
    : (outer ?? plainLabel(path, inSequence));
  // The decision enclosing everything below this config.
  const inner = source ? own : outer;

  let body: CompiledNext | undefined;
  if (cfg.stop === true) {
    body = { type: 'stop', label: own };
  } else if (cfg.one !== undefined) {
    body = compileEntries(cfg.one, [...path, 'one'], 'one', inner);
  } else if (cfg.many !== undefined) {
    body = compileEntries(cfg.many, [...path, 'many'], 'many', inner);
  } else if (cfg.next !== undefined) {
    body = compileNext(cfg.next, [...path, 'next'], inner);
  }

  if (!source) {
    // Bare `{ match }` whose match an enclosing entry already evaluated.
    if (body === undefined && cfg.match) {
      return { type: 'chain', value: [], label: own };
    }
    return body;
  }
  return {
    type: 'gate',
    match: compileMatcher(source),
    source,
    next: body ?? { type: 'chain', value: [], label: own },
  };
}

/**
 * The one reader of the route grammar. Everything else (resolution,
 * enumeration) walks the compiled form.
 *
 * `path` is the position of `next` inside the spec being compiled, `label`
 * the nearest enclosing decision (both only used for enumeration labels).
 */
export function compileNext(
  next: Route | undefined,
  path: RoutePath = [],
  label?: RouteLabel,
  inSequence = false,
): CompiledNext | undefined {
  if (next === undefined || next === null) return undefined;
  if (typeof next === 'string') {
    return {
      type: 'static',
      value: next,
      label: label ?? plainLabel(path, inSequence),
    };
  }

  if (Array.isArray(next)) {
    if (next.length === 0) return undefined;
    if (isRouteArray(next)) {
      // Pure RouteConfig[]: legacy first-match shape, an implicit `one`.
      return {
        type: 'one',
        routes: compileRoutes(next, path, 'one', label),
      };
    }
    const ids: string[] = [];
    for (const entry of next) if (typeof entry === 'string') ids.push(entry);
    if (ids.length === next.length) {
      return {
        type: 'chain',
        value: ids,
        label: label ?? plainLabel(path, inSequence),
      };
    }
    // Mixed array: a sequence, each segment resolved when reached.
    const segments: CompiledNext[] = [];
    next.forEach((entry, i) => {
      const compiled = compileNext(entry, [...path, i], label, true);
      if (compiled !== undefined) segments.push(compiled);
    });
    if (segments.length === 0) return undefined;
    return { type: 'sequence', value: segments };
  }

  return compileConfig(next, path, label, inSequence, false);
}

const compileCache = new WeakMap<object, CompiledNext>();

/**
 * Compiled form of a route spec. Object specs are compiled once and cached
 * by identity (the only route compile cache); strings compile trivially.
 */
export function compileRoute(
  spec: Route | undefined,
): CompiledNext | undefined {
  if (spec === undefined || spec === null) return undefined;
  if (typeof spec !== 'object') return compileNext(spec);
  const cached = compileCache.get(spec);
  if (cached) return cached;
  const compiled = compileNext(spec);
  if (compiled) compileCache.set(spec, compiled);
  return compiled;
}

function continuation(
  segments: readonly CompiledNext[],
  at: number,
  tail: RouteContinuation | undefined,
): RouteContinuation {
  return tail
    ? { type: 'continuation', segments, at, tail }
    : { type: 'continuation', segments, at };
}

/** Continuation that starts at the beginning of `spec`. */
export function startRoute(
  spec: Route | RouteContinuation | undefined,
): RouteContinuation | undefined {
  if (spec === undefined || spec === null) return undefined;
  if (isRouteContinuation(spec)) return spec;
  const compiled = compileRoute(spec);
  return compiled ? continuation([compiled], 0, undefined) : undefined;
}

/**
 * How a walk decides conditional nodes. Resolution decides by the root;
 * enumeration explores every option.
 */
export interface RouteDecider {
  gate(node: CompiledGateNode): boolean;
  /** Index of the chosen `one` entry, or -1 for none. */
  one(routes: readonly CompiledRoute[]): number;
  /** Indices of the matching `many` entries. */
  many(routes: readonly CompiledRoute[]): number[];
}

/**
 * The one traversal of the compiled route form. Leading static segments are
 * collected; the first conditional segment is decided only when no id was
 * collected before it (its position is reached), otherwise the walk returns
 * the ids plus the remainder as `then`.
 *
 * `visit` sees every id node whose ids were collected and every stop reached
 * (enumeration uses it for labels).
 */
export function walkRoute(
  start: RouteContinuation | undefined,
  decide: RouteDecider,
  visit?: (node: CompiledIdNode | CompiledStopNode) => void,
): NextSteps {
  const ids: string[] = [];
  let cur = start;
  while (cur) {
    if (cur.at >= cur.segments.length) {
      cur = cur.tail;
      continue;
    }
    const seg = cur.segments[cur.at];
    const after = continuation(cur.segments, cur.at + 1, cur.tail);

    if (seg.type === 'static') {
      ids.push(seg.value);
      if (visit) visit(seg);
      cur = after;
      continue;
    }
    if (seg.type === 'chain') {
      ids.push(...seg.value);
      if (visit) visit(seg);
      cur = after;
      continue;
    }
    if (seg.type === 'sequence') {
      cur = continuation(seg.value, 0, after);
      continue;
    }

    // Conditional segment: only decided once its position is reached.
    if (ids.length > 0) return { ids, then: cur };

    if (seg.type === 'stop') {
      if (visit) visit(seg);
      return { ids: [], stop: true };
    }
    if (seg.type === 'gate') {
      cur = decide.gate(seg) ? continuation([seg.next], 0, after) : after;
      continue;
    }
    if (seg.type === 'one') {
      const index = seg.routes.length > 0 ? decide.one(seg.routes) : -1;
      cur =
        index >= 0 ? continuation([seg.routes[index].next], 0, after) : after;
      continue;
    }
    // many: every matching entry is its own fork carrying the remainder.
    const matched = seg.routes.length > 0 ? decide.many(seg.routes) : [];
    if (matched.length === 0) {
      cur = after;
      continue;
    }
    if (matched.length === 1) {
      cur = continuation([seg.routes[matched[0]].next], 0, after);
      continue;
    }
    return {
      ids: [],
      forks: matched.map((index) =>
        continuation([seg.routes[index].next], 0, after),
      ),
    };
  }
  return { ids };
}

function rootDecider(root: Mapping.Root): RouteDecider {
  return {
    gate: (node) => node.match(root),
    one: (routes) => routes.findIndex((route) => route.match(root)),
    many: (routes) => {
      const matched: number[] = [];
      routes.forEach((route, index) => {
        if (route.match(root)) matched.push(index);
      });
      return matched;
    },
  };
}

/**
 * The one route resolver. Resolves `spec` (a Route or a continuation handed
 * back by an earlier call) against the resolution root `{ ingest, event }`
 * of the position that is running.
 *
 * Deterministic for the SUPPLIED root only. Static tooling that needs every
 * possible target uses `getRouteGraph`, the enumeration over the same
 * compiled form.
 */
export function getNextSteps(
  spec: Route | RouteContinuation | undefined,
  root: Mapping.Root,
): NextSteps {
  return walkRoute(startRoute(spec), rootDecider(root));
}

/** One possible resolution of a route, with the id and stop nodes it used. */
export interface RouteOutcome {
  steps: NextSteps;
  visited: (CompiledIdNode | CompiledStopNode)[];
}

/**
 * Every possible resolution of a continuation, over the same `walkRoute`
 * traversal: gates pass and fail, each `one` entry (and none, unless a
 * catch-all exists), each `many` entry (as forks, and none unless a
 * catch-all exists). Decisions are replayed depth first, so each distinct
 * decision sequence is walked exactly once.
 */
export function enumerateRoute(
  start: RouteContinuation | undefined,
): RouteOutcome[] {
  const outcomes: RouteOutcome[] = [];

  const explore = (prefix: number[]): void => {
    let position = 0;
    const fresh: number[] = [];
    const pick = (count: number): number => {
      let choice = 0;
      if (position < prefix.length) choice = prefix[position];
      else fresh.push(count);
      position++;
      return choice;
    };
    const hasCatchAll = (routes: readonly CompiledRoute[]) =>
      routes.some((route) => route.source === undefined);

    const visited: (CompiledIdNode | CompiledStopNode)[] = [];
    const steps = walkRoute(
      start,
      {
        gate: () => pick(2) === 0,
        one: (routes) => {
          const options = routes.map((_, index) => index);
          if (!hasCatchAll(routes)) options.push(-1);
          return options[pick(options.length)];
        },
        many: (routes) => {
          const all = routes.map((_, index) => index);
          if (hasCatchAll(routes)) return all;
          return pick(2) === 0 ? all : [];
        },
      },
      (node) => visited.push(node),
    );
    outcomes.push({ steps, visited });

    for (let j = 0; j < fresh.length; j++) {
      for (let option = 1; option < fresh[j]; option++) {
        const next = prefix.slice();
        for (let k = 0; k < j; k++) next.push(0);
        next.push(option);
        explore(next);
      }
    }
  };

  explore([]);
  return outcomes;
}
