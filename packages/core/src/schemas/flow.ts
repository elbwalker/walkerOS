/**
 * Flow Configuration System - Zod Schemas
 *
 * Mirrors: types/flow.ts
 * Purpose: Runtime validation and JSON Schema generation for Flow configurations
 *
 * The Flow system provides unified configuration across all walkerOS environments.
 * These schemas enable:
 * - Runtime validation of config files
 * - Clear error messages for configuration issues
 * - JSON Schema generation for IDE support
 * - Type-safe parsing with Zod
 *
 * @packageDocumentation
 */

import { z, toJsonSchema } from './validation';

// ========================================
// Primitive Type Schemas
// ========================================

/**
 * Primitive value schema for variables.
 *
 * @remarks
 * Variables can be strings, numbers, or booleans.
 * Used in Setup.variables and Config.env.
 */
export const PrimitiveSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .describe('Primitive value: string, number, or boolean');

// ========================================
// Source Reference Schema
// ========================================

/**
 * Source reference schema.
 *
 * @remarks
 * Defines how to reference and configure a source package.
 * Sources capture events from various origins (browser, HTTP, etc.).
 */
export const SourceReferenceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")',
      ),
    config: z
      .unknown()
      .optional()
      .describe('Source-specific configuration object'),
    env: z.unknown().optional().describe('Source environment configuration'),
    primary: z
      .boolean()
      .optional()
      .describe(
        'Mark as primary source (provides main elb). Only one source should be primary.',
      ),
  })
  .describe('Source package reference with configuration');

// ========================================
// Destination Reference Schema
// ========================================

/**
 * Destination reference schema.
 *
 * @remarks
 * Defines how to reference and configure a destination package.
 * Destinations send processed events to external services.
 */
export const DestinationReferenceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")',
      ),
    config: z
      .unknown()
      .optional()
      .describe('Destination-specific configuration object'),
    env: z
      .unknown()
      .optional()
      .describe('Destination environment configuration'),
  })
  .describe('Destination package reference with configuration');

// ========================================
// Flow Environment Configuration Schema
// ========================================

/**
 * Flow environment configuration schema.
 *
 * @remarks
 * Represents a single deployment environment (e.g., web_prod, server_stage).
 * Uses `.passthrough()` to allow package-specific extensions (build, docker, etc.).
 */
export const ConfigSchema = z
  .object({
    platform: z
      .enum(['web', 'server'], {
        error: 'Platform must be "web" or "server"',
      })
      .describe(
        'Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection',
      ),
    sources: z
      .record(z.string(), SourceReferenceSchema)
      .optional()
      .describe(
        'Source configurations (data capture) keyed by unique identifier',
      ),
    destinations: z
      .record(z.string(), DestinationReferenceSchema)
      .optional()
      .describe(
        'Destination configurations (data output) keyed by unique identifier',
      ),
    collector: z
      .unknown()
      .optional()
      .describe(
        'Collector configuration for event processing (uses Collector.InitConfig)',
      ),
    env: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'Environment-specific variables (override root-level variables)',
      ),
  })
  .passthrough() // Allow extension fields (build, docker, lambda, etc.)
  .describe('Single environment configuration for one deployment target');

// ========================================
// Flow Setup Schema (Root Configuration)
// ========================================

/**
 * Flow setup schema - root configuration.
 *
 * @remarks
 * This is the complete schema for walkeros.config.json files.
 * Contains multiple named environments with shared variables and definitions.
 */
export const SetupSchema = z
  .object({
    version: z
      .literal(1, {
        error: 'Only version 1 is currently supported',
      })
      .describe('Configuration schema version (currently only 1 is supported)'),
    $schema: z
      .string()
      .url('Schema URL must be a valid URL')
      .optional()
      .describe(
        'JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")',
      ),
    variables: z
      .record(z.string(), PrimitiveSchema)
      .optional()
      .describe(
        'Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)',
      ),
    definitions: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Reusable configuration definitions (reference with JSON Schema $ref syntax)',
      ),
    environments: z
      .record(z.string(), ConfigSchema)
      .refine((envs) => Object.keys(envs).length > 0, {
        message: 'At least one environment is required',
      })
      .describe(
        'Named environment configurations (e.g., web_prod, server_stage)',
      ),
  })
  .describe(
    'Complete multi-environment walkerOS configuration (walkeros.config.json)',
  );

// ========================================
// Helper Functions
// ========================================

/**
 * Parse and validate Flow.Setup configuration.
 *
 * @param data - Raw JSON data from config file
 * @returns Validated Flow.Setup object
 * @throws ZodError if validation fails with detailed error messages
 *
 * @example
 * ```typescript
 * import { parseSetup } from '@walkeros/core/schemas';
 * import { readFileSync } from 'fs';
 *
 * const raw = JSON.parse(readFileSync('walkeros.config.json', 'utf8'));
 * const config = parseSetup(raw);
 * console.log(`Found ${Object.keys(config.environments).length} environments`);
 * ```
 */
export function parseSetup(data: unknown): z.infer<typeof SetupSchema> {
  return SetupSchema.parse(data);
}

/**
 * Safely parse Flow.Setup configuration without throwing.
 *
 * @param data - Raw JSON data from config file
 * @returns Success result with data or error result with issues
 *
 * @example
 * ```typescript
 * import { safeParseSetup } from '@walkeros/core/schemas';
 *
 * const result = safeParseSetup(rawData);
 * if (result.success) {
 *   console.log('Valid config:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error.issues);
 * }
 * ```
 */
export function safeParseSetup(data: unknown) {
  return SetupSchema.safeParse(data);
}

/**
 * Parse and validate Flow.Config (single environment).
 *
 * @param data - Raw JSON data for single environment
 * @returns Validated Flow.Config object
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * import { parseConfig } from '@walkeros/core/schemas';
 *
 * const envConfig = parseConfig(rawEnvData);
 * console.log(`Platform: ${envConfig.platform}`);
 * ```
 */
export function parseConfig(data: unknown): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse(data);
}

/**
 * Safely parse Flow.Config without throwing.
 *
 * @param data - Raw JSON data for single environment
 * @returns Success result with data or error result with issues
 */
export function safeParseConfig(data: unknown) {
  return ConfigSchema.safeParse(data);
}

// ========================================
// JSON Schema Generation
// ========================================

/**
 * Generate JSON Schema for Flow.Setup.
 *
 * @remarks
 * Used for IDE validation and autocomplete.
 * Hosted at https://walkeros.io/schema/flow/v1.json
 *
 * @returns JSON Schema (Draft 7) representation of SetupSchema
 *
 * @example
 * ```typescript
 * import { setupJsonSchema } from '@walkeros/core/schemas';
 * import { writeFileSync } from 'fs';
 *
 * writeFileSync(
 *   'public/schema/flow/v1.json',
 *   JSON.stringify(setupJsonSchema, null, 2)
 * );
 * ```
 */
export const setupJsonSchema = z.toJSONSchema(SetupSchema, {
  target: 'draft-7',
});

/**
 * Generate JSON Schema for Flow.Config.
 *
 * @remarks
 * Used for validating individual environment configurations.
 *
 * @returns JSON Schema (Draft 7) representation of ConfigSchema
 */
export const configJsonSchema = toJsonSchema(ConfigSchema, 'FlowConfig');

/**
 * Generate JSON Schema for SourceReference.
 *
 * @remarks
 * Used for validating source package references.
 *
 * @returns JSON Schema (Draft 7) representation of SourceReferenceSchema
 */
export const sourceReferenceJsonSchema = toJsonSchema(
  SourceReferenceSchema,
  'SourceReference',
);

/**
 * Generate JSON Schema for DestinationReference.
 *
 * @remarks
 * Used for validating destination package references.
 *
 * @returns JSON Schema (Draft 7) representation of DestinationReferenceSchema
 */
export const destinationReferenceJsonSchema = toJsonSchema(
  DestinationReferenceSchema,
  'DestinationReference',
);
