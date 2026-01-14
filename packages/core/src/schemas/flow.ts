/**
 * Flow Configuration System - Zod Schemas
 *
 * Mirrors: types/flow.ts
 * Purpose: Runtime validation and JSON Schema generation for Flow configurations
 *
 * The Flow system provides unified configuration across all walkerOS flows.
 * These schemas enable:
 * - Runtime validation of config files
 * - Clear error messages for configuration issues
 * - JSON Schema generation for IDE support
 * - Type-safe parsing with Zod
 *
 * SCHEMA SYNC: When modifying these schemas, update website/static/schema/flow/v1.json
 * (served at https://walkeros.io/schema/flow/v1.json). For breaking changes, create v2.
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
// Shared Type Schemas
// ========================================

/**
 * Variables schema for interpolation.
 */
export const VariablesSchema = z
  .record(z.string(), PrimitiveSchema)
  .describe('Variables for interpolation');

/**
 * Definitions schema for reusable configurations.
 */
export const DefinitionsSchema = z
  .record(z.string(), z.unknown())
  .describe('Reusable configuration definitions');

/**
 * Packages schema for build configuration.
 */
export const PackagesSchema = z
  .record(
    z.string(),
    z.object({
      version: z.string().optional(),
      imports: z.array(z.string()).optional(),
      path: z.string().optional(), // Local path (takes precedence over version)
    }),
  )
  .describe('NPM packages to bundle');

// ========================================
// Platform Configuration Schemas
// ========================================

/**
 * Web platform configuration schema.
 */
export const WebSchema = z
  .object({
    windowCollector: z
      .string()
      .optional()
      .describe(
        'Window property name for collector instance (default: "collector")',
      ),
    windowElb: z
      .string()
      .optional()
      .describe('Window property name for elb function (default: "elb")'),
  })
  .describe('Web platform configuration');

/**
 * Server platform configuration schema.
 */
export const ServerSchema = z
  .object({})
  .passthrough()
  .describe('Server platform configuration (reserved for future options)');

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
    code: z
      .string()
      .optional()
      .describe(
        'Named export to use from the package (e.g., "sourceExpress"). If omitted, uses default export.',
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
    variables: VariablesSchema.optional().describe(
      'Source-level variables (highest priority in cascade)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Source-level definitions (highest priority in cascade)',
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
    code: z
      .string()
      .optional()
      .describe(
        'Named export to use from the package (e.g., "destinationAnalytics"). If omitted, uses default export.',
      ),
    config: z
      .unknown()
      .optional()
      .describe('Destination-specific configuration object'),
    env: z
      .unknown()
      .optional()
      .describe('Destination environment configuration'),
    variables: VariablesSchema.optional().describe(
      'Destination-level variables (highest priority in cascade)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Destination-level definitions (highest priority in cascade)',
    ),
  })
  .describe('Destination package reference with configuration');

// ========================================
// Flow Configuration Schema (Single Flow)
// ========================================

/**
 * Single flow configuration schema.
 *
 * @remarks
 * Represents a single deployment target (e.g., web_prod, server_stage).
 * Platform is determined by presence of `web` or `server` key.
 * Exactly one must be present.
 */
export const ConfigSchema = z
  .object({
    web: WebSchema.optional().describe(
      'Web platform configuration (browser-based tracking). Mutually exclusive with server.',
    ),
    server: ServerSchema.optional().describe(
      'Server platform configuration (Node.js). Mutually exclusive with web.',
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
    packages: PackagesSchema.optional().describe('NPM packages to bundle'),
    variables: VariablesSchema.optional().describe(
      'Flow-level variables (override Setup.variables, overridden by source/destination variables)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Flow-level definitions (extend Setup.definitions, overridden by source/destination definitions)',
    ),
  })
  .refine(
    (data) => {
      const hasWeb = data.web !== undefined;
      const hasServer = data.server !== undefined;
      return (hasWeb || hasServer) && !(hasWeb && hasServer);
    },
    {
      message: 'Exactly one of "web" or "server" must be present',
    },
  )
  .describe('Single flow configuration for one deployment target');

// ========================================
// Flow Setup Schema (Root Configuration)
// ========================================

/**
 * Flow setup schema - root configuration.
 *
 * @remarks
 * This is the complete schema for walkeros.config.json files.
 * Contains multiple named flows with shared variables and definitions.
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
    variables: VariablesSchema.optional().describe(
      'Shared variables for interpolation across all flows (use ${VAR_NAME} or ${VAR_NAME:default} syntax)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Reusable configuration definitions (reference with JSON Schema $ref syntax: { "$ref": "#/definitions/name" })',
    ),
    flows: z
      .record(z.string(), ConfigSchema)
      .refine((flows) => Object.keys(flows).length > 0, {
        message: 'At least one flow is required',
      })
      .describe(
        'Named flow configurations (e.g., production, staging, development)',
      ),
  })
  .describe(
    'Complete multi-flow walkerOS configuration (walkeros.config.json)',
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
 * import { parseSetup } from '@walkeros/core/dev';
 * import { readFileSync } from 'fs';
 *
 * const raw = JSON.parse(readFileSync('walkeros.config.json', 'utf8'));
 * const config = parseSetup(raw);
 * console.log(`Found ${Object.keys(config.flows).length} flows`);
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
 * import { safeParseSetup } from '@walkeros/core/dev';
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
 * Parse and validate Flow.Config (single flow).
 *
 * @param data - Raw JSON data for single flow
 * @returns Validated Flow.Config object
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * import { parseConfig } from '@walkeros/core/dev';
 *
 * const flowConfig = parseConfig(rawFlowData);
 * console.log(`Platform: ${flowConfig.web ? 'web' : 'server'}`);
 * ```
 */
export function parseConfig(data: unknown): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse(data);
}

/**
 * Safely parse Flow.Config without throwing.
 *
 * @param data - Raw JSON data for single flow
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
 * import { setupJsonSchema } from '@walkeros/core/dev';
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
 * Used for validating individual flow configurations.
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
