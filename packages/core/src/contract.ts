import type { Flow } from './types';

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
 * Merges matching levels additively:
 * 1. setup["*"]["*"]
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

    const levels = [
      getEntry(contract, '*', '*'),
      getEntry(contract, '*', action),
      getEntry(contract, entity, '*'),
      getEntry(contract, entity, action),
    ];

    for (const level of levels) {
      if (level) {
        result = mergeContractSchemas(result, level);
      }
    }
  }

  return result;
}

function getEntry(
  contract: Flow.Contract,
  entity: string,
  action: string,
): Record<string, unknown> | undefined {
  const entityEntry = contract[entity];
  if (!entityEntry || typeof entityEntry !== 'object') return undefined;
  const actionEntry = (entityEntry as Record<string, unknown>)[action];
  if (!actionEntry || typeof actionEntry !== 'object') return undefined;
  return actionEntry as Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
