import { z } from 'zod';
import {
  OptionalBoolean,
  OptionalIdentifier,
  AnyFunction,
  DESCRIPTIONS,
  createBooleanSchema,
  createOptionalIdSchema,
} from './primitives';
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
    onError: ErrorHandlerSchema.optional().describe(DESCRIPTIONS.onError),
    onLog: LogHandlerSchema.optional().describe(DESCRIPTIONS.onLog),
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
    verbose: createBooleanSchema(DESCRIPTIONS.verbose, true),
  })
  .partial();

/**
 * QueueConfig - Event queueing configuration
 * Used in: Destination.Config
 */
export const QueueConfig = z
  .object({
    queue: createBooleanSchema(DESCRIPTIONS.queue, true),
  })
  .partial();

/**
 * IdConfig - ID configuration pattern
 * Used in: Destination.Config, Source.Config
 */
export const IdConfig = z
  .object({
    id: OptionalIdentifier,
  })
  .partial();

/**
 * InitConfig - Initialization configuration pattern
 * Used in: Destination.Config
 */
export const InitConfig = z
  .object({
    init: createBooleanSchema(DESCRIPTIONS.init, true),
    loadScript: createBooleanSchema(DESCRIPTIONS.loadScript, true),
  })
  .partial();

/**
 * DisabledConfig - Disabled flag configuration
 * Used in: Source.Config
 */
export const DisabledConfig = z
  .object({
    disabled: createBooleanSchema(DESCRIPTIONS.disabled, true),
  })
  .partial();

/**
 * PrimaryConfig - Primary flag configuration
 * Used in: Source.Config, Source.InitSource
 */
export const PrimaryConfig = z
  .object({
    primary: createBooleanSchema(DESCRIPTIONS.primary, true),
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
    settings: z.any().optional().describe(DESCRIPTIONS.settings),
  })
  .partial();

/**
 * GenericEnvConfig - Generic environment configuration
 * Used in: Destination.Config, Source.Config, Source.BaseEnv
 * Environment is platform-specific and can't be validated generically
 */
export const GenericEnvConfig = z
  .object({
    env: z.any().optional().describe(DESCRIPTIONS.env),
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
        .describe(DESCRIPTIONS.data),
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
      mapping: RulesSchema.optional().describe(DESCRIPTIONS.mapping),
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
      policy: PolicySchema.optional().describe(DESCRIPTIONS.policy),
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
      consent: ConsentSchema.optional().describe(DESCRIPTIONS.consent),
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
    config: z.any().describe('Instance configuration'),
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
    collector: AnyFunction.describe('Collector instance (runtime object)'),
    config: z.any().describe('Configuration'),
    env: z.any().describe('Environment dependencies'),
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
    batch: z.number().optional().describe(DESCRIPTIONS.batch),
    batched: z.any().optional().describe(DESCRIPTIONS.batched),
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
    ignore: createBooleanSchema(DESCRIPTIONS.ignore, true),
    condition: z.string().optional().describe(DESCRIPTIONS.condition),
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
    sources: z.record(z.string(), z.any()).describe('Map of source instances'),
  })
  .partial();

/**
 * DestinationsMapConfig - Destinations collection pattern
 * Used in: Collector.Instance
 */
export const DestinationsMapConfig = z
  .object({
    destinations: z
      .record(z.string(), z.any())
      .describe('Map of destination instances'),
  })
  .partial();
