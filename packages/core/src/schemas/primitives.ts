import { z } from 'zod';

/**
 * Primitive Schema Definitions
 *
 * Reusable primitive schemas following DRY principle.
 * These are the building blocks used throughout all schemas to ensure consistency.
 *
 * Benefits:
 * - Single source of truth for common patterns
 * - Consistent descriptions across all schemas
 * - Easier maintenance and updates
 * - Better IntelliSense/autocomplete
 */

// ========================================
// Basic Primitives
// ========================================

/**
 * Optional string field
 * Used for optional text fields throughout schemas
 */
export const OptionalString = z.string().optional();

/**
 * Required string field
 * Used for required text fields throughout schemas
 */
export const RequiredString = z.string();

/**
 * Optional number field
 * Used for optional numeric fields throughout schemas
 */
export const OptionalNumber = z.number().optional();

/**
 * Required number field
 * Used for required numeric fields throughout schemas
 */
export const RequiredNumber = z.number();

/**
 * Optional boolean field
 * Used for optional flag fields throughout schemas
 */
export const OptionalBoolean = z.boolean().optional();

/**
 * Required boolean field
 * Used for required flag fields throughout schemas
 */
export const RequiredBoolean = z.boolean();

// ========================================
// Semantic Primitives
// ========================================

/**
 * Identifier - Required unique string identifier
 * Used for entity IDs, session IDs, etc.
 */
export const Identifier = z.string().min(1);

/**
 * OptionalIdentifier - Optional unique string identifier
 * Used for optional ID fields
 */
export const OptionalIdentifier = z.string().min(1).optional();

/**
 * Timestamp - Unix timestamp in milliseconds
 * Used for event timestamps, session timestamps, etc.
 */
export const Timestamp = z.number().int().positive();

/**
 * OptionalTimestamp - Optional Unix timestamp
 */
export const OptionalTimestamp = z.number().int().positive().optional();

/**
 * Counter - Sequential counter (non-negative integer)
 * Used for event counts, session counts, etc.
 */
export const Counter = z.number().int().nonnegative();

/**
 * OptionalCounter - Optional sequential counter
 */
export const OptionalCounter = z.number().int().nonnegative().optional();

/**
 * TaggingVersion - Version number for event tagging
 * Standardized description used in both Version and Config schemas
 */
export const TaggingVersion = z.number().describe('Tagging version number');

// ========================================
// Primitive Value Unions
// ========================================

/**
 * PrimitiveValue - Basic primitive types
 * Union of string, number, and boolean
 * Used in Property definitions and value transformations
 */
export const PrimitiveValue = z.union([z.string(), z.number(), z.boolean()]);

/**
 * OptionalPrimitiveValue - Optional primitive value
 */
export const OptionalPrimitiveValue = PrimitiveValue.optional();

// ========================================
// Generic Runtime Schemas
// ========================================

/**
 * AnyFunction - Schema for function types
 * Functions cannot be serialized, so we use z.any()
 * Used for: push, init, command, hooks, handlers, etc.
 */
export const AnyFunction = z.any();

/**
 * GenericSettings - Schema for implementation-specific settings
 * Settings are destination/source-specific and can't be validated generically
 * Used for: Destination.Config.settings, Source.Config.settings, etc.
 */
export const GenericSettings = z.any().optional();

/**
 * GenericEnv - Schema for environment dependencies
 * Environment is platform-specific (browser, node, cloud) and can't be validated generically
 * Used for: Destination.Config.env, Source.BaseEnv, etc.
 */
export const GenericEnv = z.any().optional();

/**
 * GenericRuntimeInstance - Schema for runtime instances
 * Runtime instances contain functions and state that can't be fully validated
 * Used for: collector instances, destination instances, source instances
 */
export const GenericRuntimeInstance = z.any();

// ========================================
// Standard Descriptions
// ========================================

/**
 * Standard descriptions for common fields
 * Use these to ensure consistency across schemas
 */
export const DESCRIPTIONS = {
  // Identifiers
  userId: 'User identifier',
  deviceId: 'Device identifier',
  sessionId: 'Session identifier',
  sourceId: 'Source identifier (defaults to source key)',
  destinationId:
    'Destination instance identifier (defaults to destination key)',
  eventId: 'Unique event identifier (timestamp-based)',
  pixelId: 'Tracking pixel identifier',

  // Flags
  verbose: 'Enable verbose logging for debugging',
  queue: 'Whether to queue events when consent is not granted',
  init: 'Whether to initialize immediately',
  disabled: 'Set to true to disable',
  required: 'Set to true to make field required',
  primary: 'Mark as primary (only one can be primary)',
  internal: 'Internal flag (employee, test user, etc.)',

  // Tagging
  tagging: 'Tagging version number',

  // Timestamps
  timestamp: 'Unix timestamp in milliseconds since epoch',
  sessionStart: 'Session start timestamp',
  updated: 'Last update timestamp',

  // Counters
  count: 'Sequential count',
  eventCount: 'Event count in session',
  runs: 'Number of runs',

  // Handlers
  onError: 'Error handler function: (error, state?) => void',
  onLog: 'Log handler function: (message, verbose?) => void',

  // Generic configs
  settings: 'Implementation-specific configuration',
  env: 'Environment dependencies (platform-specific)',
  data: 'Data transformation rules',
  mapping: 'Event mapping rules',
  policy: 'Pre-processing policy rules',
  consent: 'Required consent states',

  // Scripts
  loadScript: 'Whether to load external script (for web destinations)',

  // Batching
  batch: 'Batch size: bundle N events for batch processing',
  batched: 'Batch of events to be processed',

  // Processing
  ignore: 'Set to true to skip processing',
  condition: 'Condition function: return true to process',
  validate: 'Validation function: return true if valid',

  // Storage
  storage: 'Whether storage is available',

  // Triggers
  trigger: 'Event trigger identifier',
  timing: 'Event processing timing information',
  group: 'Event grouping identifier',

  // Marketing
  marketing: 'Marketing attribution flag',
};

// ========================================
// Helper Functions
// ========================================

/**
 * createIdSchema - Create an ID schema with custom description
 * @param description - Context-specific description for the ID
 * @returns Zod schema for the ID
 */
export function createIdSchema(description: string) {
  return Identifier.describe(description);
}

/**
 * createOptionalIdSchema - Create an optional ID schema with custom description
 * @param description - Context-specific description for the ID
 * @returns Zod schema for the optional ID
 */
export function createOptionalIdSchema(description: string) {
  return OptionalIdentifier.describe(description);
}

/**
 * createBooleanSchema - Create a boolean schema with custom description
 * @param description - Context-specific description for the flag
 * @param optional - Whether the field is optional
 * @returns Zod schema for the boolean
 */
export function createBooleanSchema(description: string, optional = false) {
  return optional
    ? OptionalBoolean.describe(description)
    : RequiredBoolean.describe(description);
}

/**
 * createNumberSchema - Create a number schema with custom description
 * @param description - Context-specific description for the number
 * @param optional - Whether the field is optional
 * @returns Zod schema for the number
 */
export function createNumberSchema(description: string, optional = false) {
  return optional
    ? OptionalNumber.describe(description)
    : RequiredNumber.describe(description);
}

/**
 * createTimestampSchema - Create a timestamp schema with custom description
 * @param description - Context-specific description for the timestamp
 * @param optional - Whether the field is optional
 * @returns Zod schema for the timestamp
 */
export function createTimestampSchema(description: string, optional = false) {
  return optional
    ? OptionalTimestamp.describe(description)
    : Timestamp.describe(description);
}

/**
 * createCounterSchema - Create a counter schema with custom description
 * @param description - Context-specific description for the counter
 * @param optional - Whether the field is optional
 * @returns Zod schema for the counter
 */
export function createCounterSchema(description: string, optional = false) {
  return optional
    ? OptionalCounter.describe(description)
    : Counter.describe(description);
}
