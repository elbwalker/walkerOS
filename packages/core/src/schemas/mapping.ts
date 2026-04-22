import { z, toJsonSchema } from './validation';
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

// Forward declaration for circular dependency
let ValueConfigSchemaLazy: z.ZodTypeAny;

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
export const ValueSchema: z.ZodTypeAny = z
  .lazy(() =>
    z.union([
      z.string().describe('String value or property path (e.g., "data.id")'),
      z.number().describe('Numeric value'),
      z.boolean().describe('Boolean value'),
      z.lazy(() => ValueConfigSchemaLazy),
      z.array(ValueSchema).describe('Array of values'),
    ]),
  )
  .meta({
    id: 'MappingValue',
    title: 'Mapping.Value',
    description:
      'Polymorphic transform primitive used in every mapping field. A string path, constant, operator object (map/loop/set/condition/consent), or array of values.',
  });

/**
 * Values - Array of Value objects
 * Used for multiple data transformations
 */
export const ValuesSchema = z
  .array(ValueSchema)
  .meta({
    id: 'MappingValues',
    title: 'Mapping.Values',
    description: 'Array of transformation values.',
  })
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
  .lazy(() =>
    z
      .tuple([ValueSchema, ValueSchema])
      .describe(
        'Loop transformation: [source, transform] tuple for array processing',
      ),
  )
  .meta({
    id: 'MappingLoop',
    title: 'Mapping.Loop',
    description:
      'Loop tuple [source, transform] for iterating and transforming arrays.',
  });

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
  .lazy(() =>
    z
      .array(ValueSchema)
      .describe('Set: Array of values for selection or combination'),
  )
  .meta({
    id: 'MappingSet',
    title: 'Mapping.Set',
    description: 'Set: array of values for selection or combination.',
  });

/**
 * Map - Object mapping for data transformation
 * Format: { outputKey: value, ... }
 *
 * Example: { item_id: 'data.id', item_name: 'data.name' }
 * Means: Transform event data to destination format
 */
const MapSchema: z.ZodTypeAny = z
  .lazy(() =>
    z
      .record(z.string(), ValueSchema)
      .describe('Map: Object mapping keys to transformation values'),
  )
  .meta({
    id: 'MappingMap',
    title: 'Mapping.Map',
    description: 'Map: object mapping keys to transformation values.',
  });

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
ValueConfigSchemaLazy = z
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
  .meta({
    id: 'MappingValueConfig',
    title: 'Mapping.ValueConfig',
    description:
      'Object-form value transformation with map/loop/set/condition/consent etc.',
  })
  .describe('Value transformation configuration with multiple strategies');

// Export with original name for backward compatibility
export const ValueConfigSchema = ValueConfigSchemaLazy;

// Re-export for use in other schemas
export { LoopSchema, SetSchema, MapSchema };

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
  .meta({
    id: 'MappingPolicy',
    title: 'Mapping.Policy',
    description:
      'Policy rules for event pre-processing (key → value transformation).',
  })
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
    name: z
      .string()
      .optional()
      .describe(
        'Custom event name override (e.g., "view_item" for "product view")',
      ),
    data: z
      .union([ValueSchema, ValuesSchema])
      .optional()
      .describe('Data transformation rules for event'),
    settings: z
      .any()
      .optional()
      .describe('Destination-specific settings for this event mapping'),
    condition: z
      .string()
      .optional()
      .describe('Condition function as string: return true to process event'),
    consent: ConsentSchema.optional().describe(
      'Required consent states to process this event',
    ),
    policy: PolicySchema.optional().describe(
      'Event-level policy overrides (applied after config-level policy)',
    ),
    batch: z
      .number()
      .optional()
      .describe('Batch size: bundle N events for batch processing'),
    // Note: batchFn and batched are runtime functions, not serializable
    include: z
      .array(z.string())
      .optional()
      .describe(
        'Event sections (e.g. ["context", "globals"]) flattened into context.data',
      ),
    ignore: z
      .boolean()
      .optional()
      .describe(
        'Skip the event entirely. No push, no side effects. Use for suppression.',
      ),
    skip: z
      .boolean()
      .optional()
      .describe(
        'Run side effects (settings.identify, ...) but skip the default push call.',
      ),
  })
  .meta({
    id: 'MappingRule',
    title: 'Mapping.Rule',
    description:
      'Configuration for transforming a single event at one stage of the flow (source or destination).',
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
  .meta({
    id: 'MappingRules',
    title: 'Mapping.Rules',
    description:
      'Event mapping rules tree: entity → action → Rule (or Rule[]). Use "*" as wildcard for entity or action.',
  })
  .describe(
    'Event mapping rules: entity → action → Rule. Keys match event name split by space. Use "*" as wildcard for entity or action. Priority: exact > entity wildcard > action wildcard > global wildcard (*→*).',
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
    include: z
      .array(z.string())
      .optional()
      .describe('Event sections to flatten into context.data'),
    mapping: RulesSchema.optional().describe(
      'Entity-action specific mapping rules',
    ),
    policy: PolicySchema.optional().describe(
      'Pre-processing policy rules applied before mapping',
    ),
  })
  .meta({
    id: 'MappingConfig',
    title: 'Mapping.Config',
    description:
      'Shared mapping configuration (consent, data, include, mapping, policy).',
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
  .meta({
    id: 'MappingResult',
    title: 'Mapping.Result',
    description: 'Mapping resolution result (matched rule + key).',
  })
  .describe('Mapping resolution result');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const valueJsonSchema = toJsonSchema(ValueSchema, 'Value');

export const valueConfigJsonSchema = toJsonSchema(
  ValueConfigSchema,
  'ValueConfig',
);

export const loopJsonSchema = toJsonSchema(LoopSchema, 'Loop');

export const setJsonSchema = toJsonSchema(SetSchema, 'Set');

export const mapJsonSchema = toJsonSchema(MapSchema, 'Map');

export const policyJsonSchema = toJsonSchema(PolicySchema, 'Policy');

export const ruleJsonSchema = toJsonSchema(RuleSchema, 'Rule');

export const rulesJsonSchema = toJsonSchema(RulesSchema, 'Rules');

export const configJsonSchema = toJsonSchema(ConfigSchema, 'MappingConfig');
