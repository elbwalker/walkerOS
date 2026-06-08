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
