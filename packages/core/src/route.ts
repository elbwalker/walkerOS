import type { Route, RouteConfig } from './types/transformer';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';

/**
 * Internal: compiled route data. Not exported from the package's public
 * surface (`@walkeros/core`), but exported here so adjacent test files
 * inside the core package can probe compilation.
 */
export interface CompiledRoute {
  match: CompiledMatcher;
  next: CompiledNext;
}

export type CompiledNext =
  | { type: 'static'; value: string }
  | { type: 'chain'; value: string[] }
  | { type: 'one'; routes: CompiledRoute[] }
  | { type: 'many'; routes: CompiledRoute[] }
  | { type: 'gate'; match: CompiledMatcher; next?: CompiledNext }
  | { type: 'sequence'; value: CompiledNext[] };

export function isRouteConfigEntry(entry: unknown): boolean {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    !Array.isArray(entry) &&
    ('match' in entry || 'next' in entry || 'one' in entry || 'many' in entry)
  );
}

/**
 * Pure RouteConfig array — every element is a RouteConfig object.
 * Used to detect the legacy first-match shape (treated as implicit `one`).
 */
export function isRouteArray(next: Route): next is RouteConfig[] {
  return (
    Array.isArray(next) &&
    next.length > 0 &&
    next.every((entry) => isRouteConfigEntry(entry))
  );
}

function compileRoutes(entries: Route[]): CompiledRoute[] {
  return entries.map((entry) => {
    if (typeof entry === 'string') {
      return { match: () => true, next: { type: 'static', value: entry } };
    }
    if (Array.isArray(entry)) {
      return {
        match: () => true,
        next: compileNext(entry) ?? { type: 'chain', value: [] },
      };
    }
    const e = entry as RouteConfig;
    return {
      match: e.match ? compileMatcher(e.match) : () => true,
      next: compileNext(e) ?? { type: 'chain', value: [] },
    };
  });
}

export function compileNext(next: Route | undefined): CompiledNext | undefined {
  if (next === undefined || next === null) return undefined;
  if (typeof next === 'string') return { type: 'static', value: next };

  if (Array.isArray(next)) {
    if (next.length === 0) return undefined;
    if (isRouteArray(next)) {
      // Pure RouteConfig[] — legacy first-match shape, treat as implicit { one: [...] }
      return compileNext({ one: next as RouteConfig[] });
    }
    if (next.every((entry) => typeof entry === 'string')) {
      // Pure string[] — static chain
      return { type: 'chain', value: next as string[] };
    }
    // Mixed array (strings + RouteConfig objects, possibly nested arrays) —
    // sequence form: each segment resolves independently, results concatenated.
    const segments: CompiledNext[] = [];
    for (const entry of next) {
      const compiled = compileNext(entry);
      if (compiled !== undefined) segments.push(compiled);
    }
    if (segments.length === 0) return undefined;
    return { type: 'sequence', value: segments };
  }

  // RouteConfig
  const cfg = next as RouteConfig;
  if ('next' in cfg && cfg.next !== undefined) {
    // next operator (optionally gated)
    if (cfg.match) {
      return {
        type: 'gate',
        match: compileMatcher(cfg.match),
        next: compileNext(cfg.next),
      };
    }
    return compileNext(cfg.next);
  }
  if ('one' in cfg && cfg.one) {
    const routes = compileRoutes(cfg.one);
    if (cfg.match) {
      // outer gate around the one
      return {
        type: 'gate',
        match: compileMatcher(cfg.match),
        next: { type: 'one', routes },
      };
    }
    return { type: 'one', routes };
  }
  if ('many' in cfg && cfg.many) {
    const routes = compileRoutes(cfg.many);
    if (cfg.match) {
      // outer gate around the many
      return {
        type: 'gate',
        match: compileMatcher(cfg.match),
        next: { type: 'many', routes },
      };
    }
    return { type: 'many', routes };
  }
  // Bare gate { match } — no next/one/many
  if (cfg.match) {
    return { type: 'gate', match: compileMatcher(cfg.match) };
  }

  return undefined;
}

const compileCache = new WeakMap<object, CompiledNext>();

/**
 * Resolve a Route spec against a matcher context. Returns the immediate
 * next transformer IDs.
 *
 * Return shape:
 *   []          → terminate (gate failed, empty many, all matchers failed,
 *                  undefined spec).
 *   ["x"]       → continue main chain at x.
 *   ["a","b",…] → fan-out, only produced by `many`. Main chain terminates
 *                  at this dispatch point; each branch is an independent
 *                  flow running to its own exit.
 *
 * Reachability vs prediction: `match` rules read arbitrary event fields.
 * `getNextSteps` is deterministic for the SUPPLIED context only. Static
 * analyzers without a real event must over-approximate by treating each
 * match as "may pass or fail" — see `flattenRouteTargets` in the CLI
 * validator. This function does NOT predict the path a future event will
 * take; it computes the path for the event you give it.
 */
export function getNextSteps(
  spec: Route | undefined,
  context: Record<string, unknown> = {},
): string[] {
  if (spec === undefined || spec === null) return [];
  let compiled: CompiledNext | undefined;
  if (typeof spec === 'object') {
    const cached = compileCache.get(spec);
    if (cached) {
      compiled = cached;
    } else {
      compiled = compileNext(spec);
      if (compiled) compileCache.set(spec, compiled);
    }
  } else {
    compiled = compileNext(spec);
  }
  if (!compiled) return [];
  const resolved = resolveNext(compiled, context);
  if (resolved === undefined) return [];
  return Array.isArray(resolved) ? resolved : [resolved];
}

export function resolveNext(
  compiled: CompiledNext | undefined,
  context: Record<string, unknown> = {},
): string | string[] | undefined {
  if (!compiled) return undefined;
  if (compiled.type === 'static') return compiled.value;
  if (compiled.type === 'chain') return compiled.value;
  if (compiled.type === 'gate') {
    if (!compiled.match(context)) return undefined; // gate failed → fall through
    return resolveNext(compiled.next, context);
  }
  if (compiled.type === 'sequence') {
    const ids: string[] = [];
    for (const segment of compiled.value) {
      const resolved = resolveNext(segment, context);
      if (resolved === undefined) continue;
      if (Array.isArray(resolved)) ids.push(...resolved);
      else ids.push(resolved);
    }
    return ids.length > 0 ? ids : undefined;
  }
  if (compiled.type === 'many') {
    const ids: string[] = [];
    for (const route of compiled.routes) {
      if (!route.match(context)) continue;
      const inner = resolveNext(route.next, context);
      if (inner === undefined) continue;
      if (Array.isArray(inner)) ids.push(...inner);
      else ids.push(inner);
    }
    return ids.length > 0 ? ids : undefined;
  }
  // one: first-match dispatch
  for (const route of compiled.routes) {
    if (route.match(context)) {
      return resolveNext(route.next, context);
    }
  }
  return undefined;
}
