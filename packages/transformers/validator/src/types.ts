import type { Mapping, WalkerOS } from '@walkeros/core';
import type { JSONSchemaType } from 'ajv';

/**
 * Partial JSON Schema type - we auto-add type: 'object'.
 * Can include: required, properties, additionalProperties, etc.
 */
export type JsonSchema = Partial<JSONSchemaType<unknown>>;

/**
 * Contract rule for event-specific validation.
 * Extends the shape expected by getMappingEvent.
 */
export interface ContractRule {
  /**
   * Condition function - first matching rule wins.
   * MUST be synchronous. getMappingEvent uses .find() which doesn't await.
   * For async checks, validate in the schema or use a separate transformer.
   */
  condition?: (event: WalkerOS.DeepPartialEvent) => boolean;

  /**
   * JSON Schema (partial) - we auto-add type: 'object'.
   * Can include: required, properties, additionalProperties, etc.
   */
  schema: JsonSchema;
}

/**
 * Contract extends Mapping.Rules for type compatibility with getMappingEvent.
 * This avoids `as any` casting and ensures strict typing.
 */
export type Contract = Mapping.Rules<ContractRule>;

/**
 * Validator transformer settings.
 */
export interface ValidatorSettings {
  /**
   * Validate full WalkerOS.Event structure.
   * Pre-compiled at transformer init, runs on every event.
   * Validates all fields exist with correct types.
   * @default true
   */
  format?: boolean;

  /**
   * Event-specific validation rules.
   * Entity/action keyed, supports wildcards and conditions.
   * Schemas lazy-compiled on first match.
   */
  contract?: Contract;
}
