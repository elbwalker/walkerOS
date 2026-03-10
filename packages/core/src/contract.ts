import type { Flow } from './types';

/** Section keys that map to WalkerOS.Event fields. */
const SECTION_KEYS = [
  'globals',
  'context',
  'custom',
  'user',
  'consent',
] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

/** Contract sections extracted from a v2 contract. */
export interface ContractSections {
  globals?: Record<string, unknown>;
  context?: Record<string, unknown>;
  custom?: Record<string, unknown>;
  user?: Record<string, unknown>;
  consent?: Record<string, unknown>;
}

/** Check if a contract uses v2 structured format. */
export function isV2Contract(contract: Flow.Contract): boolean {
  return contract.version === 2;
}

/**
 * Extract the entity-action event map from a contract.
 * - v2: returns `contract.events`
 * - Legacy: returns the flat map with metadata keys stripped
 */
export function getContractEvents(
  contract: Flow.Contract,
): Record<string, Record<string, unknown>> {
  if (isV2Contract(contract)) {
    return (contract.events || {}) as Record<string, Record<string, unknown>>;
  }

  // Legacy: filter out metadata and non-object entries
  const events: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(contract)) {
    if (key.startsWith('$')) continue;
    if (key === 'version' || key === 'description') continue;
    if (SECTION_KEYS.includes(key as SectionKey)) continue;
    if (typeof value === 'object' && value !== null) {
      events[key] = value as Record<string, unknown>;
    }
  }
  return events;
}

/**
 * Extract cross-event sections from a v2 contract.
 * Returns empty sections for legacy contracts.
 */
export function getContractSections(contract: Flow.Contract): ContractSections {
  if (!isV2Contract(contract)) return {};

  const sections: ContractSections = {};
  for (const key of SECTION_KEYS) {
    if (contract[key] && typeof contract[key] === 'object') {
      sections[key] = contract[key] as Record<string, unknown>;
    }
  }
  return sections;
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
 * Resolve a contract for a specific entity-action pair.
 *
 * Legacy: Merges matching wildcard levels from flat entity-action map.
 * v2: Same wildcard merging from `events`, then merges top-level
 *     sections (globals, context, etc.) into `properties.*`.
 *
 * Levels merged additively:
 * 1. setup["*"]["*"]  (or events["*"]["*"])
 * 2. setup["*"][action]
 * 3. setup[entity]["*"]
 * 4. setup[entity][action]
 * 5-8. Same for config-level contract
 */
export function resolveContract(
  setup: Flow.Contract,
  entity: string,
  action: string,
  config?: Flow.Contract,
): Record<string, unknown> {
  let result: Record<string, unknown> = {};

  for (const contract of [setup, config]) {
    if (!contract) continue;

    // Get the entity-action map (v2: from events, legacy: from root)
    const events = getContractEvents(contract);

    const levels = [
      getEntry(events, '*', '*'),
      getEntry(events, '*', action),
      getEntry(events, entity, '*'),
      getEntry(events, entity, action),
    ];

    for (const level of levels) {
      if (level) {
        result = mergeContractSchemas(result, level);
      }
    }

    // v2: merge top-level sections into properties.*
    if (isV2Contract(contract)) {
      const sections = getContractSections(contract);
      for (const [key, schema] of Object.entries(sections)) {
        if (!schema) continue;
        const sectionAsProperty: Record<string, unknown> = {
          properties: { [key]: schema },
        };
        result = mergeContractSchemas(result, sectionAsProperty);
      }
    }
  }

  return result;
}

function getEntry(
  events: Record<string, Record<string, unknown>>,
  entity: string,
  action: string,
): Record<string, unknown> | undefined {
  const entityEntry = events[entity];
  if (!entityEntry || typeof entityEntry !== 'object') return undefined;
  const actionEntry = entityEntry[action];
  if (!actionEntry || typeof actionEntry !== 'object') return undefined;
  return actionEntry as Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
