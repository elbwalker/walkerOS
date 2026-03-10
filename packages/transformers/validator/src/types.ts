import type { JSONSchemaType } from 'ajv';

/**
 * Partial JSON Schema type - we auto-add type: 'object'.
 */
export type JsonSchema = Partial<JSONSchemaType<unknown>>;

/**
 * Contract event rules — entity → action → JSON Schema.
 * The validator matches events by entity-action and validates
 * against the corresponding schema.
 */
export type ContractEvents = Record<string, Record<string, JsonSchema>>;

/**
 * Validator transformer settings.
 */
export interface ValidatorSettings {
  /**
   * Validate full WalkerOS.Event structure.
   * @default true
   */
  format?: boolean;

  /**
   * Entity-action event validation schemas.
   * Resolved from $contract.name.events.
   * Supports wildcards via findEventSchema.
   */
  events?: ContractEvents;

  /** JSON Schema for event.globals — validates on every event. */
  globals?: JsonSchema;

  /** JSON Schema for event.context — validates on every event. */
  context?: JsonSchema;

  /** JSON Schema for event.custom — validates on every event. */
  custom?: JsonSchema;

  /** JSON Schema for event.user — validates on every event. */
  user?: JsonSchema;

  /** JSON Schema for event.consent — validates on every event. */
  consent?: JsonSchema;
}
