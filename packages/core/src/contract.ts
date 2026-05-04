import type { Flow } from './types';
import { throwError } from './throwError';

/** Section keys that map to WalkerOS.Event fields. */
const SECTION_KEYS = [
  'globals',
  'context',
  'custom',
  'user',
  'consent',
] as const;

/** Annotation keys to strip from AJV-compatible schemas. */
const ANNOTATION_KEYS = new Set([
  'description',
  'examples',
  'title',
  '$comment',
]);

/**
 * Resolve all named contracts: process extends chains, expand wildcards,
 * strip annotations from event schemas.
 *
 * Returns a fully resolved map where each contract entry has inherited
 * properties merged in and wildcards expanded into concrete actions.
 */
export function resolveContracts(
  contracts: Flow.Contract,
): Record<string, Flow.ContractRule> {
  const resolved: Record<string, Flow.ContractRule> = {};
  const resolving = new Set<string>(); // Circular detection

  function resolve(name: string): Flow.ContractRule {
    if (resolved[name]) return resolved[name];

    if (resolving.has(name)) {
      throwError(
        `Circular extends chain detected: ${[...resolving, name].join(' → ')}`,
      );
    }

    const entry = contracts[name];
    if (!entry) {
      throwError(`Contract "${name}" not found`);
    }

    resolving.add(name);

    let result: Flow.ContractRule = {};

    // 1. Resolve parent first (if extends)
    if (entry.extends) {
      const parent = resolve(entry.extends);
      result = mergeContractEntries(parent, entry);
    } else {
      result = { ...entry };
    }

    // Remove extends from resolved entry
    delete result.extends;

    // 2. Expand wildcards in events
    if (result.events) {
      result.events = expandWildcards(result.events);
    }

    // 3. Strip annotations from event schemas (not from section schemas)
    if (result.events) {
      const stripped: Flow.ContractEvents = {};
      for (const [entity, actions] of Object.entries(result.events)) {
        stripped[entity] = {};
        for (const [action, schema] of Object.entries(actions)) {
          stripped[entity][action] = stripAnnotations(schema);
        }
      }
      result.events = stripped;
    }

    resolving.delete(name);
    resolved[name] = result;
    return result;
  }

  // Resolve all contracts
  for (const name of Object.keys(contracts)) {
    resolve(name);
  }

  return resolved;
}

/**
 * Merge two contract entries additively.
 * Sections merge via mergeContractSchemas.
 * Events merge at the entity-action level.
 * Metadata: child wins for scalars.
 */
function mergeContractEntries(
  parent: Flow.ContractRule,
  child: Flow.ContractRule,
): Flow.ContractRule {
  const result: Flow.ContractRule = {};

  // Merge metadata (child wins)
  if (parent.description !== undefined || child.description !== undefined) {
    result.description = child.description ?? parent.description;
  }

  // Merge sections additively
  for (const key of SECTION_KEYS) {
    const p = parent[key];
    const c = child[key];
    if (p && c) {
      result[key] = mergeContractSchemas(
        p as Record<string, unknown>,
        c as Record<string, unknown>,
      );
    } else if (p || c) {
      result[key] = { ...((p || c) as Record<string, unknown>) };
    }
  }

  // Merge events
  if (parent.events || child.events) {
    const merged: Flow.ContractEvents = {};
    const allEntities = new Set([
      ...Object.keys(parent.events || {}),
      ...Object.keys(child.events || {}),
    ]);

    for (const entity of allEntities) {
      const pActions = parent.events?.[entity] || {};
      const cActions = child.events?.[entity] || {};
      const allActions = new Set([
        ...Object.keys(pActions),
        ...Object.keys(cActions),
      ]);

      merged[entity] = {};
      for (const action of allActions) {
        const pSchema = pActions[action];
        const cSchema = cActions[action];
        if (pSchema && cSchema) {
          merged[entity][action] = mergeContractSchemas(
            pSchema as Record<string, unknown>,
            cSchema as Record<string, unknown>,
          );
        } else {
          merged[entity][action] = {
            ...((pSchema || cSchema) as Record<string, unknown>),
          };
        }
      }
    }

    result.events = merged;
  }

  return result;
}

/**
 * Expand wildcards in an events map.
 * Merges *.* into all concrete actions, *.action into matching actions,
 * entity.* into all actions of that entity.
 */
function expandWildcards(events: Flow.ContractEvents): Flow.ContractEvents {
  const result: Flow.ContractEvents = {};

  // For each concrete entity-action pair, merge all matching wildcard levels
  for (const entity of Object.keys(events)) {
    if (entity === '*') continue;
    result[entity] = {};

    for (const action of Object.keys(events[entity] || {})) {
      let merged: Record<string, unknown> = {};

      // Level 1: *.*
      const globalWild = events['*']?.['*'];
      if (globalWild)
        merged = mergeContractSchemas(
          merged,
          globalWild as Record<string, unknown>,
        );

      // Level 2: *.action
      const actionWild = events['*']?.[action];
      if (actionWild && action !== '*')
        merged = mergeContractSchemas(
          merged,
          actionWild as Record<string, unknown>,
        );

      // Level 3: entity.*
      const entityWild = events[entity]?.['*'];
      if (entityWild && action !== '*')
        merged = mergeContractSchemas(
          merged,
          entityWild as Record<string, unknown>,
        );

      // Level 4: entity.action
      const exact = events[entity]?.[action];
      if (exact)
        merged = mergeContractSchemas(merged, exact as Record<string, unknown>);

      result[entity][action] = merged;
    }
  }

  // Preserve * entries for reference
  if (events['*']) {
    result['*'] = { ...events['*'] };
  }

  return result;
}

/**
 * Deep merge two JSON Schema objects with additive semantics.
 * - `required` arrays: union (deduplicated)
 * - `properties`: deep merge (child wins on conflict for scalars)
 * - Scalars: child overrides parent
 */
export function mergeContractSchemas(
  parent: Record<string, unknown>,
  child: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...parent };

  for (const key of Object.keys(child)) {
    const parentVal = parent[key];
    const childVal = child[key];

    if (
      key === 'required' &&
      Array.isArray(parentVal) &&
      Array.isArray(childVal)
    ) {
      result[key] = [...new Set([...parentVal, ...childVal])];
    } else if (isPlainObject(parentVal) && isPlainObject(childVal)) {
      result[key] = mergeContractSchemas(
        parentVal as Record<string, unknown>,
        childVal as Record<string, unknown>,
      );
    } else {
      result[key] = childVal;
    }
  }

  return result;
}

/**
 * Strip annotation-only keys from a schema (deep).
 */
function stripAnnotations(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (ANNOTATION_KEYS.has(key)) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = stripAnnotations(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
