import type { Route, RouteConfig } from './types/transformer';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';

export interface CompiledRoute {
  match: CompiledMatcher;
  next: CompiledNext;
}

export type CompiledNext =
  | { type: 'static'; value: string }
  | { type: 'chain'; value: string[] }
  | { type: 'case'; routes: CompiledRoute[] }
  | { type: 'gate'; match: CompiledMatcher; next?: CompiledNext };

export function isRouteArray(next: Route): next is RouteConfig[] {
  return (
    Array.isArray(next) &&
    next.length > 0 &&
    typeof next[0] === 'object' &&
    next[0] !== null &&
    ('match' in next[0] || 'next' in next[0] || 'case' in next[0])
  );
}

export function compileNext(next: Route | undefined): CompiledNext | undefined {
  if (next === undefined || next === null) return undefined;
  if (typeof next === 'string') return { type: 'static', value: next };

  if (Array.isArray(next)) {
    if (next.length === 0) return undefined;
    if (isRouteArray(next)) {
      // Legacy first-match shape — treat as implicit { case: [...] }
      return compileNext({ case: next as RouteConfig[] });
    }
    // string[] | nested Route[] — sequence form
    return { type: 'chain', value: next as string[] };
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
  if ('case' in cfg && cfg.case) {
    const routes: CompiledRoute[] = cfg.case.map((entry) => {
      if (typeof entry === 'string') {
        return { match: () => true, next: { type: 'static', value: entry } };
      }
      if (Array.isArray(entry)) {
        return { match: () => true, next: compileNext(entry)! };
      }
      const e = entry as RouteConfig;
      return {
        match: e.match ? compileMatcher(e.match) : () => true,
        next: compileNext(e) ?? { type: 'chain', value: [] },
      };
    });
    if (cfg.match) {
      // outer gate around the case
      return {
        type: 'gate',
        match: compileMatcher(cfg.match),
        next: { type: 'case', routes },
      };
    }
    return { type: 'case', routes };
  }
  // Bare gate { match } — no next/case
  if (cfg.match) {
    return { type: 'gate', match: compileMatcher(cfg.match) };
  }

  return undefined;
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
  // case: first-match
  for (const route of compiled.routes) {
    if (route.match(context)) {
      return resolveNext(route.next, context);
    }
  }
  return undefined;
}
