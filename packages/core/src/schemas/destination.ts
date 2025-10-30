import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ConsentSchema, EventSchema } from './walkeros';
import {
  ValueSchema,
  ValuesSchema,
  RuleSchema,
  RulesSchema,
  PolicySchema,
} from './mapping';

/**
 * Destination Schemas
 *
 * Mirrors: types/destination.ts
 * Purpose: Runtime validation and JSON Schema generation for destination configurations
 *
 * Destinations are the endpoints where processed events are sent (analytics tools,
 * marketing platforms, data warehouses, etc.). This file defines schemas for:
 * - Destination configuration
 * - Type bundles for generic constraints
 * - Push contexts
 * - Batching structures
 */

// ========================================
// Configuration Schemas
// ========================================

/**
 * Config - Destination configuration
 *
 * Defines how a destination processes events:
 * - Consent requirements
 * - Settings (destination-specific)
 * - Data transformations
 * - Environment dependencies
 * - Initialization options
 * - Mapping rules
 * - Processing policies
 * - Queueing behavior
 * - Logging verbosity
 * - Error/log handlers
 *
 * Generic note: settings, env, and mapping can have destination-specific types
 * but for schema validation we use z.any() to allow flexibility
 */
export const ConfigSchema = z
  .object({
    consent: ConsentSchema.optional().describe(
      'Required consent states to send events to this destination',
    ),
    settings: z
      .any()
      .optional()
      .describe(
        'Destination-specific configuration (e.g., API keys, measurement IDs)',
      ),
    data: z
      .union([ValueSchema, ValuesSchema])
      .optional()
      .describe(
        'Global data transformation applied to all events for this destination',
      ),
    env: z
      .any()
      .optional()
      .describe('Environment dependencies (e.g., global objects, DOM APIs)'),
    id: z
      .string()
      .optional()
      .describe(
        'Destination instance identifier (defaults to destination key)',
      ),
    init: z
      .boolean()
      .optional()
      .describe('Whether to initialize destination immediately'),
    loadScript: z
      .boolean()
      .optional()
      .describe('Whether to load external script (for web destinations)'),
    mapping: RulesSchema.optional().describe(
      'Entity-action specific mapping rules for this destination',
    ),
    policy: PolicySchema.optional().describe(
      'Pre-processing policy rules applied before event mapping',
    ),
    queue: z
      .boolean()
      .optional()
      .describe('Whether to queue events when consent is not granted'),
    verbose: z
      .boolean()
      .optional()
      .describe('Enable verbose logging for debugging'),
    // Note: onError and onLog are functions, not easily serializable
    // We use z.any() to allow them but don't validate structure
    onError: z.any().optional().describe('Error handler function'),
    onLog: z.any().optional().describe('Log handler function'),
  })
  .describe('Destination configuration');

/**
 * PartialConfig - Config with all fields optional and partial settings
 * Used for config updates and overrides
 */
export const PartialConfigSchema = ConfigSchema.deepPartial().describe(
  'Partial destination configuration with all fields deeply optional',
);

/**
 * Policy - Processing policy rules
 * Maps policy keys to transformation values
 * Applied before event mapping
 */
export const DestinationPolicySchema = PolicySchema.describe(
  'Destination policy rules for event pre-processing',
);

// ========================================
// Context Schemas
// ========================================

/**
 * Context - Base destination context
 * Passed to init and push functions
 * Contains collector instance, config, data, and environment
 *
 * Note: collector is runtime instance, not easily serializable
 */
export const ContextSchema = z
  .object({
    collector: z.any().describe('Collector instance (runtime object)'),
    config: ConfigSchema.describe('Destination configuration'),
    data: z
      .union([
        z.any(), // WalkerOS.Property
        z.undefined(),
        z.array(z.union([z.any(), z.undefined()])),
      ])
      .optional()
      .describe('Transformed event data'),
    env: z.any().describe('Environment dependencies'),
  })
  .describe('Destination context for init and push functions');

/**
 * PushContext - Context for push function
 * Extends Context with mapping rule information
 */
export const PushContextSchema = ContextSchema.extend({
  mapping: RuleSchema.optional().describe(
    'Resolved mapping rule for this specific event',
  ),
}).describe('Push context with event-specific mapping');

/**
 * PushBatchContext - Context for pushBatch function
 * Same as PushContext but for batch processing
 */
export const PushBatchContextSchema = PushContextSchema.describe(
  'Batch push context with event-specific mapping',
);

// ========================================
// Batch Processing Schemas
// ========================================

/**
 * PushEvent - Single event with mapping in a batch
 */
export const PushEventSchema = z
  .object({
    event: EventSchema.describe('The event to process'),
    mapping: RuleSchema.optional().describe('Mapping rule for this event'),
  })
  .describe('Event with optional mapping for batch processing');

/**
 * PushEvents - Array of PushEvent
 */
export const PushEventsSchema = z
  .array(PushEventSchema)
  .describe('Array of events with mappings');

/**
 * Batch - Batched events for processing
 * Groups events by mapping key for efficient batch sends
 */
export const BatchSchema = z
  .object({
    key: z
      .string()
      .describe('Batch key (usually mapping key like "product.view")'),
    events: z.array(EventSchema).describe('Array of events in batch'),
    data: z
      .array(
        z.union([
          z.any(), // WalkerOS.Property
          z.undefined(),
          z.array(z.union([z.any(), z.undefined()])),
        ]),
      )
      .describe('Transformed data for each event'),
    mapping: RuleSchema.optional().describe('Shared mapping rule for batch'),
  })
  .describe('Batch of events grouped by mapping key');

/**
 * Data - Transformed event data types
 * Can be single property, undefined, or array of properties
 */
export const DataSchema = z
  .union([
    z.any(), // WalkerOS.Property
    z.undefined(),
    z.array(z.union([z.any(), z.undefined()])),
  ])
  .describe('Transformed event data (Property, undefined, or array)');

// ========================================
// Instance Schemas
// ========================================

/**
 * Instance - Destination instance (runtime object)
 *
 * Note: This schema is primarily for documentation
 * Runtime functions (init, push, pushBatch) cannot be validated
 * Use z.any() for function fields
 */
export const InstanceSchema = z
  .object({
    config: ConfigSchema.describe('Destination configuration'),
    queue: z
      .array(EventSchema)
      .optional()
      .describe('Queued events awaiting consent'),
    dlq: z
      .array(z.tuple([EventSchema, z.any()]))
      .optional()
      .describe('Dead letter queue (failed events with errors)'),
    type: z.string().optional().describe('Destination type identifier'),
    env: z.any().optional().describe('Environment dependencies'),
    // Functions - not validated, use z.any()
    init: z.any().optional().describe('Initialization function'),
    push: z.any().describe('Push function for single events'),
    pushBatch: z.any().optional().describe('Batch push function'),
    on: z.any().optional().describe('Event lifecycle hook function'),
  })
  .describe('Destination instance (runtime object with functions)');

/**
 * Init - Initialization config
 * Contains destination code and configuration
 */
export const InitSchema = z
  .object({
    code: InstanceSchema.describe('Destination instance with implementation'),
    config: PartialConfigSchema.optional().describe(
      'Partial configuration overrides',
    ),
    env: z.any().optional().describe('Partial environment overrides'),
  })
  .describe('Destination initialization configuration');

/**
 * InitDestinations - Map of destination IDs to Init configs
 */
export const InitDestinationsSchema = z
  .record(z.string(), InitSchema)
  .describe('Map of destination IDs to initialization configurations');

/**
 * Destinations - Map of destination IDs to instances
 */
export const DestinationsSchema = z
  .record(z.string(), InstanceSchema)
  .describe('Map of destination IDs to runtime instances');

// ========================================
// Result Schemas
// ========================================

/**
 * Ref - Destination reference
 * Links destination ID to instance
 */
export const RefSchema = z
  .object({
    id: z.string().describe('Destination ID'),
    destination: InstanceSchema.describe('Destination instance'),
  })
  .describe('Destination reference (ID + instance)');

/**
 * Push - Push operation result
 */
export const PushResultSchema = z
  .object({
    queue: z
      .array(EventSchema)
      .optional()
      .describe('Events queued (awaiting consent)'),
    error: z.any().optional().describe('Error if push failed'),
  })
  .describe('Push operation result');

/**
 * Result - Overall processing result
 * Categorizes destinations by processing outcome
 */
export const ResultSchema = z
  .object({
    successful: z
      .array(RefSchema)
      .describe('Destinations that processed successfully'),
    queued: z.array(RefSchema).describe('Destinations that queued events'),
    failed: z.array(RefSchema).describe('Destinations that failed to process'),
  })
  .describe('Overall destination processing result');

/**
 * DLQ - Dead Letter Queue
 * Array of failed events with their errors
 */
export const DLQSchema = z
  .array(z.tuple([EventSchema, z.any()]))
  .describe('Dead letter queue: [(event, error), ...]');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const configJsonSchema = zodToJsonSchema(ConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'DestinationConfig',
});

export const partialConfigJsonSchema = zodToJsonSchema(PartialConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'PartialDestinationConfig',
});

export const contextJsonSchema = zodToJsonSchema(ContextSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'DestinationContext',
});

export const pushContextJsonSchema = zodToJsonSchema(PushContextSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'PushContext',
});

export const batchJsonSchema = zodToJsonSchema(BatchSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'Batch',
});

export const instanceJsonSchema = zodToJsonSchema(InstanceSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'DestinationInstance',
});

export const resultJsonSchema = zodToJsonSchema(ResultSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'DestinationResult',
});
