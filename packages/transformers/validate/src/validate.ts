import type { Flow, Ingest, ValidateEvents, WalkerOS } from '@walkeros/core';
import * as cfworker from '@cfworker/json-schema';
import type { ContractSource, ValidationIssue } from './types';
import { eventFormatSchema } from './event-format.schema';

/**
 * Module-level Validator cache keyed by the compact JSON of the schema.
 *
 * A plain Map (not WeakMap): schemas are re-cloned per flow load, so identical
 * structures arrive as distinct object references. Keying on serialized content
 * lets repeated pushes within and across loads share one compiled interpreter.
 */
const validatorCache = new Map<string, cfworker.Validator>();

export function getValidator(
  schema: Record<string, unknown>,
): cfworker.Validator {
  const key = JSON.stringify(schema);
  const cached = validatorCache.get(key);
  if (cached) return cached;
  // cfworker dereferences $ref by annotating each subschema in place
  // (e.g. __absolute_uri__). Parse a fresh mutable copy from the cache key so a
  // frozen input (the generated eventFormatSchema) stays untouched.
  const mutable = JSON.parse(key) as Record<string, unknown>;
  // Pin draft 2020-12 (the contract authoring draft).
  const validator = new cfworker.Validator(mutable, '2020-12');
  validatorCache.set(key, validator);
  return validator;
}

function isContractRule(source: ContractSource): source is Flow.ContractRule {
  return (
    typeof source === 'object' &&
    source !== null &&
    'events' in source &&
    typeof (source as { events?: unknown }).events === 'object'
  );
}

/**
 * Selects the entity-action schema with the documented wildcard fallback:
 * entity.action → entity.* → *.action → *.*.
 */
function selectEventSchema(
  events: ValidateEvents,
  entity: string,
  action: string,
): Record<string, unknown> | undefined {
  return (
    events[entity]?.[action] ??
    events[entity]?.['*'] ??
    events['*']?.[action] ??
    events['*']?.['*']
  );
}

/** Collects every JSON Schema that applies to this event. */
function collectSchemas(
  event: WalkerOS.DeepPartialEvent,
  opts: { contracts?: ContractSource[]; format?: boolean },
): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];

  if (opts.format) schemas.push(eventFormatSchema);

  for (const source of opts.contracts ?? []) {
    if (isContractRule(source)) {
      const entity = typeof event.entity === 'string' ? event.entity : '';
      const action = typeof event.action === 'string' ? event.action : '';
      const selected = selectEventSchema(source.events ?? {}, entity, action);
      if (selected) schemas.push(selected);
      if (source.schema) schemas.push(source.schema);
    } else {
      // Inline whole-event JSON Schema.
      schemas.push(source);
    }
  }

  return schemas;
}

/**
 * The validation verdict authority. Runs the event through every applicable
 * JSON Schema (AND semantics) and aggregates all @cfworker errors.
 *
 * No matching constraint (empty schema set) means no opinion: isValid is true.
 */
export function validateEventAgainstContract(
  event: WalkerOS.DeepPartialEvent,
  _ingest: Ingest | undefined,
  opts: { contracts?: ContractSource[]; format?: boolean },
): { isValid: boolean; errors: ValidationIssue[] } {
  const schemas = collectSchemas(event, opts);

  const errors: ValidationIssue[] = [];
  for (const schema of schemas) {
    const result = getValidator(schema).validate(event);
    if (!result.valid) {
      for (const unit of result.errors) {
        errors.push({
          path: unit.instanceLocation,
          message: unit.error,
          level: 'error',
        });
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
