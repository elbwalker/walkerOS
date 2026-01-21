import { z } from './validation';
import {} from './primitives';
import { ErrorHandlerSchema, LogHandlerSchema } from './utilities';

/**
 * Common Schema Patterns
 *
 * Reusable schema patterns that appear across multiple domain schemas.
 * These patterns combine primitives into commonly used configurations.
 *
 * Benefits:
 * - DRY principle for complex patterns
 * - Consistent configuration interfaces
 * - Single source of truth for common configs
 * - Easier to maintain and update patterns globally
 */

// ========================================
// Handler Patterns
// ========================================

/**
 * HandlersConfig - Error and log handler configuration
 * Used in: Destination.Config, Collector.Config, Source.Config
 */
export const HandlersConfig = z
  .object({
    onError: ErrorHandlerSchema.optional().describe(
      'Error handler function: (error, state?) => void',
    ),
    onLog: LogHandlerSchema.optional().describe(
      'Log handler function: (message, verbose?) => void',
    ),
  })
  .partial();

// ========================================
// Configuration Patterns
// ========================================

/**
 * VerboseConfig - Verbose logging configuration
 * Used in: Destination.Config, Collector.Config
 */
export const VerboseConfig = z
  .object({
    verbose: z
      .boolean()
      .describe('Enable verbose logging for debugging')
      .optional(),
  })
  .partial();

/**
 * QueueConfig - Event queueing configuration
 * Used in: Destination.Config
 */
export const QueueConfig = z
  .object({
    queue: z
      .boolean()
      .describe('Whether to queue events when consent is not granted')
      .optional(),
  })
  .partial();

/**
 * IdConfig - ID configuration pattern
 * Used in: Destination.Config, Source.Config
 */
export const IdConfig = z.object({}).partial();

/**
 * InitConfig - Initialization configuration pattern
 * Used in: Destination.Config
 */
export const InitConfig = z
  .object({
    init: z.boolean().describe('Whether to initialize immediately').optional(),
    loadScript: z
      .boolean()
      .describe('Whether to load external script (for web destinations)')
      .optional(),
  })
  .partial();

/**
 * DisabledConfig - Disabled flag configuration
 * Used in: Source.Config
 */
export const DisabledConfig = z
  .object({
    disabled: z.boolean().describe('Set to true to disable').optional(),
  })
  .partial();

/**
 * PrimaryConfig - Primary flag configuration
 * Used in: Source.Config, Source.InitSource
 */
export const PrimaryConfig = z
  .object({
    primary: z
      .boolean()
      .describe('Mark as primary (only one can be primary)')
      .optional(),
  })
  .partial();

// ========================================
// Generic Configuration Patterns
// ========================================

/**
 * GenericSettingsConfig - Generic settings configuration
 * Used in: Destination.Config, Source.Config, Collector runtime
 * Settings are implementation-specific and can't be validated generically
 */
export const GenericSettingsConfig = z
  .object({
    settings: z
      .any()
      .optional()
      .describe('Implementation-specific configuration'),
  })
  .partial();

/**
 * GenericEnvConfig - Generic environment configuration
 * Used in: Destination.Config, Source.Config, Source.BaseEnv
 * Environment is platform-specific and can't be validated generically
 */
export const GenericEnvConfig = z
  .object({
    env: z
      .any()
      .optional()
      .describe('Environment dependencies (platform-specific)'),
  })
  .partial();

// ========================================
// Mapping Patterns
// ========================================

/**
 * DataTransformationConfig - Data transformation configuration
 * Used in: Destination.Config, Mapping.Config, Mapping.Rule
 *
 * Note: This creates a forward reference to ValueSchema/ValuesSchema
 * Import from mapping.ts to avoid circular dependencies
 */
export function createDataTransformationConfig(
  ValueSchema: z.ZodTypeAny,
  ValuesSchema: z.ZodTypeAny,
) {
  return z
    .object({
      data: z
        .union([ValueSchema, ValuesSchema])
        .optional()
        .describe('Data transformation rules'),
    })
    .partial();
}

/**
 * MappingRulesConfig - Mapping rules configuration
 * Used in: Destination.Config, Source.Config (via Mapping.Config)
 *
 * Note: This creates a forward reference to RulesSchema
 * Import from mapping.ts to avoid circular dependencies
 */
export function createMappingRulesConfig(RulesSchema: z.ZodTypeAny) {
  return z
    .object({
      mapping: RulesSchema.optional().describe('Event mapping rules'),
    })
    .partial();
}

/**
 * PolicyConfig - Policy rules configuration
 * Used in: Destination.Config, Mapping.Config, Mapping.Rule
 *
 * Note: This creates a forward reference to PolicySchema
 * Import from mapping.ts to avoid circular dependencies
 */
export function createPolicyConfig(PolicySchema: z.ZodTypeAny) {
  return z
    .object({
      policy: PolicySchema.optional().describe('Pre-processing policy rules'),
    })
    .partial();
}

/**
 * ConsentConfig - Consent requirements configuration
 * Used in: Destination.Config, Mapping.Config, Mapping.Rule, Event
 *
 * Note: This creates a forward reference to ConsentSchema
 * Import from walkeros.ts to avoid circular dependencies
 */
export function createConsentConfig(ConsentSchema: z.ZodTypeAny) {
  return z
    .object({
      consent: ConsentSchema.optional().describe('Required consent states'),
    })
    .partial();
}

// ========================================
// Instance Patterns
// ========================================

/**
 * RuntimeInstanceConfig - Runtime instance configuration
 * Used in: Destination.Instance, Source.Instance, Collector.Instance
 *
 * Common fields for runtime instances:
 * - type: Instance type identifier
 * - config: Configuration object
 * - Functions (push, init, etc.) are instance-specific
 */
export const RuntimeInstanceConfig = z
  .object({
    type: z.string().optional().describe('Instance type identifier'),
    config: z.unknown().describe('Instance configuration'),
  })
  .partial();

// ========================================
// Context Patterns
// ========================================

/**
 * BaseContextConfig - Base context configuration
 * Used in: Destination.Context, Source contexts
 *
 * Common fields for contexts:
 * - collector: Collector instance (runtime)
 * - config: Configuration
 * - env: Environment dependencies
 */
export const BaseContextConfig = z
  .object({
    collector: z.unknown().describe('Collector instance (runtime object)'),
    config: z.unknown().describe('Configuration'),
    env: z.unknown().describe('Environment dependencies'),
  })
  .partial();

// ========================================
// Batch Patterns
// ========================================

/**
 * BatchConfig - Batch processing configuration
 * Used in: Mapping.Rule
 */
export const BatchConfig = z
  .object({
    batch: z
      .number()
      .optional()
      .describe('Batch size: bundle N events for batch processing'),
    batched: z.unknown().optional().describe('Batch of events to be processed'),
  })
  .partial();

// ========================================
// Processing Patterns
// ========================================

/**
 * ProcessingControlConfig - Processing control flags
 * Used in: Mapping.Rule
 */
export const ProcessingControlConfig = z
  .object({
    ignore: z.boolean().describe('Set to true to skip processing').optional(),
    condition: z
      .string()
      .optional()
      .describe('Condition function: return true to process'),
  })
  .partial();

// ========================================
// Collection Patterns
// ========================================

/**
 * SourcesMapConfig - Sources collection pattern
 * Used in: Collector.Instance
 */
export const SourcesMapConfig = z
  .object({
    sources: z
      .record(z.string(), z.unknown())
      .describe('Map of source instances'),
  })
  .partial();

/**
 * DestinationsMapConfig - Destinations collection pattern
 * Used in: Collector.Instance
 */
export const DestinationsMapConfig = z
  .object({
    destinations: z
      .record(z.string(), z.unknown())
      .describe('Map of destination instances'),
  })
  .partial();
