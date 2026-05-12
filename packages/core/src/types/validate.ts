/**
 * Structural JSON Schema type. Kept dep-free (no `ajv` import in core)
 * so the runtime graph of any consumer of `@walkeros/core` does not pull
 * AJV transitively. Validator package uses its own ajv-typed alias internally.
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Entity-action keyed event validation schemas.
 * Wildcard fallback at runtime: entity.action → entity.* → *.action → *.*.
 */
export type ValidateEvents = Record<string, Record<string, JsonSchema>>;

/**
 * Step-level validation primitive. Same shape as the validator transformer's settings.
 * Auto-injected by `autoInjectValidators` into the chain at the step's position.
 */
export interface Validate {
  /** Validate full WalkerOS.Event structure (default true for event-shaped inputs). */
  format?: boolean;
  /** Entity-action keyed JSON Schemas. */
  events?: ValidateEvents;
  /** Generic JSON Schema run against the full input. */
  schema?: JsonSchema;
}
