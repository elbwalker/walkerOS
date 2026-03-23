import type { Next, Route } from './types/transformer';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';

interface CompiledRoute {
  match: CompiledMatcher;
  next: CompiledNext;
}

type CompiledNext =
  | { type: 'static'; value: string }
  | { type: 'chain'; value: string[] }
  | { type: 'routes'; routes: CompiledRoute[] };

export function isRouteArray(next: Next): next is Route[] {
  return (
    Array.isArray(next) &&
    next.length > 0 &&
    typeof next[0] === 'object' &&
    next[0] !== null &&
    'match' in next[0]
  );
}

export function compileNext(next: Next | undefined): CompiledNext | undefined {
  if (next === undefined || next === null) return undefined;
  if (typeof next === 'string') return { type: 'static', value: next };

  if (Array.isArray(next)) {
    if (next.length === 0) return undefined;
    if (isRouteArray(next)) {
      const routes: CompiledRoute[] = next.map((route) => ({
        match: compileMatcher(route.match),
        next: compileNext(route.next)!,
      }));
      return { type: 'routes', routes };
    }
    return { type: 'chain', value: next as string[] };
  }

  return undefined;
}

export function resolveNext(
  compiled: CompiledNext | undefined,
  ingest: Record<string, unknown> = {},
): string | string[] | undefined {
  if (!compiled) return undefined;
  if (compiled.type === 'static') return compiled.value;
  if (compiled.type === 'chain') return compiled.value;

  for (const route of compiled.routes) {
    if (route.match(ingest)) {
      return resolveNext(route.next, ingest);
    }
  }

  return undefined;
}
