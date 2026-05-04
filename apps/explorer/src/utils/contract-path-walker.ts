import type { Flow } from '@walkeros/core';
import { resolveContracts } from '@walkeros/core';

export interface PathCompletion {
  key: string;
  type?: string;
  detail?: string;
}

// Cache resolved contracts to avoid re-resolving on every keystroke.
let cachedRawJson = '';
let cachedResolved: Record<string, Flow.ContractRule> = {};

function getResolved(raw: Flow.Contract): Record<string, Flow.ContractRule> {
  const json = JSON.stringify(raw);
  if (json !== cachedRawJson) {
    try {
      cachedResolved = resolveContracts(raw);
      cachedRawJson = json;
    } catch {
      return {};
    }
  }
  return cachedResolved;
}

/**
 * Extract property names and types from a JSON Schema object.
 */
export function getSchemaPropertyCompletions(
  schema: Record<string, unknown>,
): PathCompletion[] {
  const props = schema.properties;
  if (!props || typeof props !== 'object') return [];

  return Object.entries(props as Record<string, Record<string, unknown>>).map(
    ([key, value]) => ({
      key,
      type: typeof value?.type === 'string' ? value.type : undefined,
    }),
  );
}

/**
 * Get available completions at a given dot-path into the resolved contract.
 *
 * Path examples:
 * - [] → contract names ("default", "web")
 * - ["web"] → top-level keys ("globals", "events", "tagging", ...)
 * - ["web", "events"] → entity names ("page", "product")
 * - ["web", "events", "page"] → action names ("view", "read")
 * - ["web", "events", "page", "view"] → schema properties ("title", "url")
 * - ["web", "globals"] → globals schema properties ("lang", "env")
 */
export function getContractPathCompletions(
  raw: Flow.Contract,
  pathSegments: string[],
): PathCompletion[] {
  if (!raw || Object.keys(raw).length === 0) return [];

  const resolved = getResolved(raw);
  if (Object.keys(resolved).length === 0) return [];

  // Level 0: contract names
  if (pathSegments.length === 0) {
    return Object.keys(resolved).map((key) => ({
      key,
      detail: resolved[key].description || 'contract',
    }));
  }

  const [contractName, ...rest] = pathSegments;
  const entry = resolved[contractName];
  if (!entry) return [];

  // Level 1: top-level keys of a contract entry
  if (rest.length === 0) {
    const keys: PathCompletion[] = [];
    if (entry.tagging !== undefined)
      keys.push({ key: 'tagging', type: 'number' });
    if (entry.description !== undefined)
      keys.push({ key: 'description', type: 'string' });
    for (const section of [
      'globals',
      'context',
      'custom',
      'user',
      'consent',
    ] as const) {
      if (entry[section]) keys.push({ key: section, detail: 'schema' });
    }
    if (entry.events) keys.push({ key: 'events', detail: 'entity map' });
    return keys;
  }

  // Level 2+: walk into the entry
  const firstKey = rest[0];

  // Section schemas (globals, context, custom, user, consent)
  const sectionKeys = ['globals', 'context', 'custom', 'user', 'consent'];
  if (sectionKeys.includes(firstKey)) {
    const schema = entry[firstKey as keyof Flow.ContractRule];
    if (!schema || typeof schema !== 'object') return [];
    if (rest.length === 1) {
      return getSchemaPropertyCompletions(schema as Record<string, unknown>);
    }
    return walkSchemaPath(schema as Record<string, unknown>, rest.slice(1));
  }

  // Events path
  if (firstKey === 'events') {
    if (!entry.events) return [];

    // ["events"] → entity names
    if (rest.length === 1) {
      return Object.keys(entry.events)
        .filter((k) => k !== '*')
        .map((key) => ({ key, detail: 'entity' }));
    }

    const entity = rest[1];
    const actions = entry.events[entity];
    if (!actions) return [];

    // ["events", "page"] → action names
    if (rest.length === 2) {
      return Object.keys(actions)
        .filter((k) => k !== '*')
        .map((key) => ({ key, detail: 'action' }));
    }

    const action = rest[2];
    const schema = actions[action];
    if (!schema || typeof schema !== 'object') return [];

    // ["events", "page", "view"] → schema properties
    if (rest.length === 3) {
      return getSchemaPropertyCompletions(schema as Record<string, unknown>);
    }

    // Deeper: walk into nested schema
    return walkSchemaPath(schema as Record<string, unknown>, rest.slice(3));
  }

  return [];
}

/**
 * Walk into nested JSON Schema properties by path segments.
 */
function walkSchemaPath(
  schema: Record<string, unknown>,
  segments: string[],
): PathCompletion[] {
  let current = schema;
  for (const seg of segments) {
    const props = current.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!props || !props[seg]) return [];
    current = props[seg];
  }
  return getSchemaPropertyCompletions(current);
}

/**
 * Clear the resolution cache (useful for testing).
 */
export function clearContractCache(): void {
  cachedRawJson = '';
  cachedResolved = {};
}
