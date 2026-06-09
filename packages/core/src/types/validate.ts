/**
 * Structural JSON Schema type. Kept dep-free (no `ajv` import in core)
 * so the runtime graph of any consumer of `@walkeros/core` does not pull
 * AJV transitively.
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Entity-action keyed event validation schemas.
 * Wildcard fallback semantic: entity.action → entity.* → *.action → *.*.
 */
export type ValidateEvents = Record<string, Record<string, JsonSchema>>;

/**
 * Step-level validation primitive. Declares validation intent for a source,
 * transformer, or destination: a `format` toggle, entity-action keyed schemas,
 * and/or a generic JSON Schema for the full input. Declarative only,
 * consumers (CLI tooling, MCP, custom runners) decide whether and how to enforce.
 */
export interface Validate {
  /** Validate the full `WalkerOS.Event` structural shape. */
  format?: boolean;
  /** Entity-action keyed JSON Schemas. */
  events?: ValidateEvents;
  /** Generic JSON Schema for the full input. */
  schema?: JsonSchema;
}
