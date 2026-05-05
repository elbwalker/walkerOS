import type { Flow } from '@walkeros/core';
import { parseComponentRef } from '../../core/parse-component-ref.js';

export type ComponentKind = 'source' | 'destination' | 'store';

export interface ResolvedComponent {
  kind: ComponentKind;
  id: string;
  packageName: string;
  config: unknown;
  env: unknown;
}

const VALID_KINDS = ['source', 'destination', 'store'] as const;

/**
 * Lookup definition for a single bucket of components on the resolved Flow.
 *
 * The flow buckets (`sources`, `destinations`, `stores`) all share the same
 * minimal shape we need here: an optional `package` plus opaque `config` and
 * `env`. We type each bucket against this narrow read-only view to avoid
 * any/unknown casts when probing dynamic kinds.
 */
interface BucketEntry {
  package?: string;
  config?: unknown;
  env?: unknown;
}

/** Pluck the right bucket off a resolved Flow for a given kind. */
function getBucket(
  flow: Flow,
  kind: ComponentKind,
): Record<string, BucketEntry> | undefined {
  switch (kind) {
    case 'source':
      return flow.sources;
    case 'destination':
      return flow.destinations;
    case 'store':
      return flow.stores;
  }
}

/** Plural label for a kind, used in error messages. */
function pluralLabel(kind: ComponentKind): string {
  switch (kind) {
    case 'source':
      return 'sources';
    case 'destination':
      return 'destinations';
    case 'store':
      return 'stores';
  }
}

/**
 * Parse `<kind>.<name>` syntax matching `walker push --simulate`.
 * Throws on invalid kind, missing component, or unparseable input.
 */
export function resolveComponent(
  flow: Flow,
  target: string,
): ResolvedComponent {
  const { prefix, name: id } = parseComponentRef(target, {
    allowed: VALID_KINDS,
  });
  const kind: ComponentKind = prefix;

  const bucket = getBucket(flow, kind);
  const def = bucket?.[id];
  if (!def) {
    const available = Object.keys(bucket ?? {}).join(', ') || '(none)';
    throw new Error(
      `${kind} "${id}" not found in flow. Available ${pluralLabel(kind)}: ${available}`,
    );
  }
  if (!def.package) {
    throw new Error(`${kind}.${id} has no "package", cannot resolve setup.`);
  }
  return {
    kind,
    id,
    packageName: def.package,
    config: def.config ?? {},
    env: def.env ?? {},
  };
}
