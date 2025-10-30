import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ConsentSchema } from './walkeros';

/**
 * Mapping System Schemas
 *
 * Mirrors: types/mapping.ts
 * Purpose: Runtime validation and JSON Schema generation for event transformation rules
 *
 * The mapping system allows flexible transformation of events as they flow through
 * the collector to destinations. This includes:
 * - Value extraction and transformation
 * - Conditional logic
 * - Data mapping and restructuring
 * - Array processing (loops)
 * - Consent-based filtering
 *
 * Key Features:
 * - Recursive value definitions (Value → ValueConfig → Value)
 * - Loop vs Set distinction via JSON Schema (minItems/maxItems)
 * - Lazy evaluation for circular dependencies
 * - Function serialization support (functions as strings)
 */

// ========================================
// Recursive Value Schemas
// ========================================

/**
 * Value - Core value type for mapping transformations
 *
 * Can be:
 * - Primitive: string, number, boolean
 * - ValueConfig: Complex transformation object
 * - Array: Multiple values/configs
 *
 * Recursive structure allows nested transformations
 */
export const ValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string().describe('String value or property path (e.g., "data.id")'),
    z.number().describe('Numeric value'),
    z.boolean().describe('Boolean value'),
    ValueConfigSchema,
    z.array(ValueSchema).describe('Array of values'),
  ]),
);

/**
 * Values - Array of Value objects
 * Used for multiple data transformations
 */
export const ValuesSchema = z
  .array(ValueSchema)
  .describe('Array of transformation values');

/**
 * Loop - Tuple for array processing
 * Format: [source, transform]
 *
 * IMPORTANT: z.tuple() generates JSON Schema with minItems/maxItems = 2
 * This is how Explorer distinguishes Loop from Set
 *
 * Example: ['nested', { map: { id: 'data.id' } }]
 * Means: Iterate over event.nested array, transform each item
 */
const LoopSchema: z.ZodTypeAny = z
  .tuple([ValueSchema, ValueSchema])
  .describe(
    'Loop transformation: [source, transform] tuple for array processing',
  );

/**
 * Set - Array of values for selection/combination
 * Format: [value1, value2, ...]
 *
 * IMPORTANT: z.array() generates JSON Schema without minItems/maxItems
 * This distinguishes Set from Loop
 *
 * Example: ['data.firstName', ' ', 'data.lastName']
 * Means: Combine multiple values
 */
const SetSchema: z.ZodTypeAny = z
  .array(ValueSchema)
  .describe('Set: Array of values for selection or combination');

/**
 * Map - Object mapping for data transformation
 * Format: { outputKey: value, ... }
 *
 * Example: { item_id: 'data.id', item_name: 'data.name' }
 * Means: Transform event data to destination format
 */
const MapSchema: z.ZodTypeAny = z
  .record(z.string(), ValueSchema)
  .describe('Map: Object mapping keys to transformation values');

/**
 * ValueConfig - Configuration object for value transformations
 *
 * Supports multiple transformation strategies:
 * - key: Extract property from event (e.g., "data.id")
 * - value: Static primitive value
 * - fn: Custom transformation function (as string)
 * - map: Object mapping for structured output
 * - loop: Array iteration and transformation
 * - set: Value combination/selection
 * - consent: Consent-based filtering
 * - condition: Conditional transformation
 * - validate: Value validation
 *
 * At least one property must be present.
 */
const ValueConfigSchema: z.ZodTypeAny = z
  .object({
    key: z
      .string()
      .optional()
      .describe(
        'Property path to extract from event (e.g., "data.id", "user.email")',
      ),
    value: z
      .union([z.string(), z.number(), z.boolean()])
      .optional()
      .describe('Static primitive value'),
    fn: z
      .string()
      .optional()
      .describe('Custom transformation function as string (serialized)'),
    map: MapSchema.optional().describe(
      'Object mapping: transform event data to structured output',
    ),
    loop: LoopSchema.optional().describe(
      'Loop transformation: [source, transform] for array processing',
    ),
    set: SetSchema.optional().describe(
      'Set of values: combine or select from multiple values',
    ),
    consent: ConsentSchema.optional().describe(
      'Required consent states to include this value',
    ),
    condition: z
      .string()
      .optional()
      .describe('Condition function as string: return true to include value'),
    validate: z
      .string()
      .optional()
      .describe('Validation function as string: return true if value is valid'),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'ValueConfig must have at least one property',
  })
  .describe('Value transformation configuration with multiple strategies');

// Re-export for use in other schemas
export { ValueConfigSchema, LoopSchema, SetSchema, MapSchema };

// ========================================
// Policy Schema
// ========================================

/**
 * Policy - Pre-processing rules
 * Applied before event mapping
 * Maps policy keys to transformation values
 *
 * Example: { 'consent.marketing': true }
 * Means: Only process events with marketing consent
 */
export const PolicySchema = z
  .record(z.string(), ValueSchema)
  .describe('Policy rules for event pre-processing (key → value mapping)');

// ========================================
// Mapping Rule Schemas
// ========================================

/**
 * Rule - Event-specific mapping configuration
 *
 * Defines how to transform events for a specific entity-action combination
 * Can include:
 * - Batching configuration
 * - Conditional processing
 * - Consent requirements
 * - Custom settings
 * - Data transformation
 * - Event naming
 * - Policy overrides
 */
export const RuleSchema = z
  .object({
    batch: z
      .number()
      .optional()
      .describe('Batch size: bundle N events for batch processing'),
    // Note: batchFn and batched are runtime functions, not serializable
    condition: z
      .string()
      .optional()
      .describe('Condition function as string: return true to process event'),
    consent: ConsentSchema.optional().describe(
      'Required consent states to process this event',
    ),
    settings: z
      .any()
      .optional()
      .describe('Destination-specific settings for this event mapping'),
    data: z
      .union([ValueSchema, ValuesSchema])
      .optional()
      .describe('Data transformation rules for event'),
    ignore: z
      .boolean()
      .optional()
      .describe('Set to true to skip processing this event'),
    name: z
      .string()
      .optional()
      .describe(
        'Custom event name override (e.g., "view_item" for "product view")',
      ),
    policy: PolicySchema.optional().describe(
      'Event-level policy overrides (applied after config-level policy)',
    ),
  })
  .describe('Mapping rule for specific entity-action combination');

/**
 * Rules - Nested mapping rules structure
 * Format: { entity: { action: Rule | Rule[], ... }, ... }
 *
 * Supports:
 * - Specific entity-action mappings
 * - Wildcard patterns (entity: *, action: *)
 * - Multiple rules per entity-action (array)
 *
 * Example:
 * {
 *   product: {
 *     view: { name: 'view_item' },
 *     add: { name: 'add_to_cart' }
 *   },
 *   page: {
 *     '*': { name: 'page_interaction' }
 *   }
 * }
 */
export const RulesSchema = z
  .record(
    z.string(),
    z.record(z.string(), z.union([RuleSchema, z.array(RuleSchema)])).optional(),
  )
  .describe(
    'Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support',
  );

/**
 * Config - Shared mapping configuration
 * Used by both Source.Config and Destination.Config
 *
 * Provides:
 * - Consent requirements
 * - Global data transformations
 * - Entity-action mapping rules
 * - Pre-processing policies
 */
export const ConfigSchema = z
  .object({
    consent: ConsentSchema.optional().describe(
      'Required consent states to process any events',
    ),
    data: z
      .union([ValueSchema, ValuesSchema])
      .optional()
      .describe('Global data transformation applied to all events'),
    mapping: RulesSchema.optional().describe(
      'Entity-action specific mapping rules',
    ),
    policy: PolicySchema.optional().describe(
      'Pre-processing policy rules applied before mapping',
    ),
  })
  .describe('Shared mapping configuration for sources and destinations');

/**
 * Result - Mapping resolution result
 * Contains the resolved mapping rule and key used
 */
export const ResultSchema = z
  .object({
    eventMapping: RuleSchema.optional().describe(
      'Resolved mapping rule for event',
    ),
    mappingKey: z
      .string()
      .optional()
      .describe('Mapping key used (e.g., "product.view")'),
  })
  .describe('Mapping resolution result');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const valueJsonSchema = zodToJsonSchema(ValueSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Value',
});

export const valueConfigJsonSchema = zodToJsonSchema(ValueConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'ValueConfig',
});

export const loopJsonSchema = zodToJsonSchema(LoopSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Loop',
});

export const setJsonSchema = zodToJsonSchema(SetSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Set',
});

export const mapJsonSchema = zodToJsonSchema(MapSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Map',
});

export const policyJsonSchema = zodToJsonSchema(PolicySchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Policy',
});

export const ruleJsonSchema = zodToJsonSchema(RuleSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Rule',
});

export const rulesJsonSchema = zodToJsonSchema(RulesSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Rules',
});

export const configJsonSchema = zodToJsonSchema(ConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'MappingConfig',
});
