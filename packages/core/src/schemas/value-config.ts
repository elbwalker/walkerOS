import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Zod Schemas for walkerOS Mapping ValueConfig
 *
 * These schemas provide:
 * 1. Runtime validation for mapping values
 * 2. JSON Schema generation for RJSF/Explorer
 * 3. Documentation via .describe()
 *
 * Note: TypeScript types remain in packages/core/src/types/mapping.ts
 * These Zod schemas are for VALIDATION and JSON SCHEMA GENERATION only.
 *
 * The circular/recursive nature of Value → ValueConfig → Value makes
 * full type inference complex, so we use z.any() with lazy evaluation
 * and keep existing TypeScript types separate.
 *
 * @example
 * // Validate at runtime
 * const result = ValueConfigSchema.safeParse(userInput);
 *
 * // Generate JSON Schema for Explorer
 * const jsonSchema = zodToJsonSchema(ValueConfigSchema);
 */

/**
 * Consent schema
 * Maps consent groups to boolean states
 */
export const ConsentSchema = z
  .record(z.string(), z.boolean())
  .describe('Consent requirement mapping');

/**
 * Recursive schemas - use z.any() to avoid circular type issues
 * These work for validation and JSON Schema generation
 */
const ValueSchemaLazy: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    ValueConfigSchemaLazy,
    z.array(ValueSchemaLazy),
  ]),
);

/**
 * Loop schema - TUPLE with exactly 2 elements
 * [source, transform]
 *
 * **KEY FEATURE**: This is how we distinguish Loop from Set!
 * z.tuple([a, b]) → JSON Schema: { type: 'array', minItems: 2, maxItems: 2 }
 * z.array(a) → JSON Schema: { type: 'array' }
 *
 * Explorer type detector reads minItems/maxItems to detect loops.
 */
const LoopSchemaLazy: z.ZodType<any> = z
  .tuple([ValueSchemaLazy, ValueSchemaLazy])
  .describe('Loop: [source, transform] tuple for array transformations');

/**
 * Set schema - ARRAY with any number of elements
 * [value1, value2, ...]
 */
const SetSchemaLazy: z.ZodType<any> = z
  .array(ValueSchemaLazy)
  .describe('Set: Array of values');

/**
 * Map schema - Object with string keys and Value values
 * { key1: value1, key2: value2, ... }
 */
const MapSchemaLazy: z.ZodType<any> = z
  .record(z.string(), ValueSchemaLazy)
  .describe('Map: Object mapping keys to values');

/**
 * ValueConfig schema - Configuration object for value transformations
 *
 * Properties:
 * - key: Property path string (e.g., "data.id")
 * - value: Static primitive value
 * - fn: Function string for custom transformation
 * - map: Object with key-value mappings
 * - loop: Tuple [source, transform] for array processing
 * - set: Array of values
 * - consent: Consent requirements
 * - condition: Condition function string
 * - validate: Validation function string
 *
 * At least one property must be present.
 */
const ValueConfigSchemaLazy: z.ZodType<any> = z
  .object({
    key: z.string().optional().describe('Property path (e.g., "data.id")'),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe('Static primitive value'),
    fn: z
      .string()
      .optional()
      .describe('Function string for custom transformation'),
    map: MapSchemaLazy.optional().describe('Object with key-value mappings'),
    loop: LoopSchemaLazy.optional().describe('Tuple [source, transform]'),
    set: SetSchemaLazy.optional().describe('Array of values'),
    consent: ConsentSchema.optional().describe('Required consent states'),
    condition: z.string().optional().describe('Condition function string'),
    validate: z.string().optional().describe('Validation function string'),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ValueConfig must have at least one property',
  })
  .describe('Value configuration for transformations');

// Export schemas for validation
export const ValueSchema = ValueSchemaLazy;
export const LoopSchema = LoopSchemaLazy;
export const SetSchema = SetSchemaLazy;
export const MapSchema = MapSchemaLazy;
export const ValueConfigSchema = ValueConfigSchemaLazy;

// JSON Schema generation for RJSF/Explorer
export const valueConfigJsonSchema = zodToJsonSchema(ValueConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'ValueConfig',
});

export const loopJsonSchema = zodToJsonSchema(LoopSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'Loop',
});

export const setJsonSchema = zodToJsonSchema(SetSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'Set',
});

export const mapJsonSchema = zodToJsonSchema(MapSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'Map',
});
