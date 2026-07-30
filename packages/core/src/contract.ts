import type { Flow } from './types';
import { throwError } from './throwError';

/**
 * Annotation keywords removed at schema positions when stripping. JSON Schema
 * defines them as annotations: validators ignore them, so removing them never
 * changes a verdict, it only trims resolved artifacts.
 */
const ANNOTATION_KEYS = new Set([
  'description',
  'examples',
  'title',
  '$comment',
]);

/**
 * Stripping walks ONLY the positions the spec defines as holding schemas.
 * Everything else is the author's data and passes through byte-for-byte, so
 * an unknown or vendor keyword (`x-tagging: { title: ... }`) can never lose
 * its contents. The three sets below enumerate those positions; together with
 * ANNOTATION_KEYS they are the complete traversal rule.
 *
 * Keywords whose value is a single sub-schema. A boolean there (draft
 * 2020-12 allows `additionalProperties: false`) is not an object and passes
 * through.
 */
const SCHEMA_KEYWORDS = new Set([
  'additionalItems',
  'additionalProperties',
  'contains',
  'contentSchema',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
]);

/**
 * Keywords whose value is an ARRAY of sub-schemas; each element is a schema
 * position. `items` appears here and in SCHEMA_KEYWORDS because draft-07
 * tuples use its array form; the runtime type decides which rule applies.
 *
 * Only these arrays are walked. A blanket array walk would be actively wrong:
 * `enum` and `const` members are matched by DEEP EQUALITY, so rewriting
 * `enum: [{ title: 'Tee' }]` to `enum: [{}]` does not merely drop an
 * annotation, it inverts the constraint into one that rejects the very value
 * the author declared.
 */
const SCHEMA_ARRAY_KEYWORDS = new Set([
  'allOf',
  'anyOf',
  'items',
  'oneOf',
  'prefixItems',
]);

/**
 * Keywords whose value is a MAP keyed by author-chosen names rather than by
 * schema keywords. `properties: { title: ... }` names a data key called
 * `title`, which is ordinary e-commerce markup, not an annotation. Nothing is
 * stripped at that level; each value is a schema position again.
 *
 * A value is a sub-schema under most of these, a key LIST under
 * `dependentRequired`, and either one under the draft-07 combined
 * `dependencies`. All three are handled: only object values are descended into.
 */
const NAME_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  'dependentRequired',
  'dependencies',
  '$defs',
  'definitions',
]);

/** Options for {@link resolveContracts}. */
export interface ResolveContractsOptions {
  /**
   * When true (default), annotation keywords (`description`, `examples`,
   * `title`, `$comment`) are stripped from event schemas. Validators ignore
   * annotations, so this never changes a validation verdict; it only trims
   * resolved artifacts, e.g. contracts inlined into shipped bundles. Set to
   * false to keep annotations (e.g. for IntelliSense that surfaces property
   * descriptions).
   */
  stripAnnotations?: boolean;
}

/**
 * Resolve all named contracts: process extend chains, expand wildcards,
 * strip annotations from event schemas.
 *
 * Returns a fully resolved map where each contract entry has inherited
 * properties merged in and wildcards expanded into concrete actions.
 *
 * By default annotations are stripped. Pass `{ stripAnnotations: false }` to
 * preserve `description`/`examples`/`title` on event schemas.
 */
export function resolveContracts(
  contracts: Flow.Contract,
  options?: ResolveContractsOptions,
): Record<string, Flow.ContractRule> {
  const strip = options?.stripAnnotations !== false;
  const resolved: Record<string, Flow.ContractRule> = {};
  const resolving = new Set<string>(); // Circular detection

  function resolve(name: string): Flow.ContractRule {
    if (resolved[name]) return resolved[name];

    if (resolving.has(name)) {
      throwError(
        `Circular extend chain detected: ${[...resolving, name].join(' → ')}`,
      );
    }

    const entry = contracts[name];
    if (!entry) {
      throwError(`Contract "${name}" not found`);
    }

    resolving.add(name);

    let result: Flow.ContractRule = {};

    // 1. Resolve parent first (if extend)
    if (entry.extend) {
      const parent = resolve(entry.extend);
      result = mergeContractEntries(parent, entry);
    } else {
      result = { ...entry };
    }

    // Remove extend from resolved entry
    delete result.extend;

    // 2. Expand wildcards in events
    if (result.events) {
      result.events = expandWildcards(result.events);
    }

    // 3. Strip annotations from event schemas (not from section schemas).
    //    Skipped when stripAnnotations is false (annotation-preserving view).
    if (result.events && strip) {
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
 * Scalar metadata (tagging, description): child wins, otherwise inherited.
 * `schema`: deep additive merge via mergeContractSchemas.
 * `events`: per-entity-action merge.
 */
function mergeContractEntries(
  parent: Flow.ContractRule,
  child: Flow.ContractRule,
): Flow.ContractRule {
  const result: Flow.ContractRule = {};

  // Scalar metadata: child overrides if set, otherwise inherited.
  if (parent.tagging !== undefined || child.tagging !== undefined) {
    result.tagging = child.tagging ?? parent.tagging;
  }
  if (parent.description !== undefined || child.description !== undefined) {
    result.description = child.description ?? parent.description;
  }

  // Schema: additive deep-merge via mergeContractSchemas.
  if (parent.schema && child.schema) {
    result.schema = mergeContractSchemas(
      parent.schema as Record<string, unknown>,
      child.schema as Record<string, unknown>,
    ) as Flow.ContractRule['schema'];
  } else if (parent.schema || child.schema) {
    result.schema = {
      ...((parent.schema || child.schema) as Record<string, unknown>),
    } as Flow.ContractRule['schema'];
  }

  // Events: per-entity-action merge (unchanged semantics).
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
 * Strip annotation-only keys from a schema (deep), at schema-KEYWORD positions
 * only. A data key named `title` or `description` keeps its whole sub-schema:
 * only a keyword that annotates a schema is an annotation.
 *
 * Traversal is an allowlist over the spec-defined schema positions and is
 * fail-safe: a keyword in none of the sets (instance data like `const`,
 * `default`, `enum`; vendor extensions; anything future drafts add) is copied
 * through untouched, never descended into.
 */
function stripAnnotations(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (ANNOTATION_KEYS.has(key)) continue;
    if (NAME_MAP_KEYWORDS.has(key) && isPlainObject(value)) {
      result[key] = stripNameMap(value);
    } else if (SCHEMA_ARRAY_KEYWORDS.has(key) && Array.isArray(value)) {
      result[key] = value.map((element) =>
        isPlainObject(element) ? stripAnnotations(element) : element,
      );
    } else if (SCHEMA_KEYWORDS.has(key) && isPlainObject(value)) {
      result[key] = stripAnnotations(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Every key here is an author-chosen name, so all of them survive; each value
 * is a schema position again (or, under `dependentRequired`, a key list, which
 * is not an object and passes through).
 */
function stripNameMap(map: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(map)) {
    result[name] = isPlainObject(value) ? stripAnnotations(value) : value;
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
