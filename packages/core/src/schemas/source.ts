import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ConfigSchema as MappingConfigSchema } from './mapping';
import {
  GenericSettings,
  GenericEnv,
  OptionalBoolean,
  createOptionalIdSchema,
  createBooleanSchema,
} from './primitives';
import { ErrorHandlerSchema } from './utilities';

/**
 * Source Schemas
 *
 * Mirrors: types/source.ts
 * Purpose: Runtime validation and JSON Schema generation for source configurations
 *
 * Sources are the entry points where events enter walkerOS:
 * - Browser sources (DOM events, dataLayer)
 * - Server sources (HTTP handlers, cloud functions)
 * - App sources (mobile, desktop)
 *
 * Sources are platform-agnostic through dependency injection via BaseEnv.
 * All platform-specific dependencies (DOM, HTTP, etc.) are provided through
 * the env object, making sources testable and portable.
 *
 * Key concept: Source.push IS the handler - no wrappers needed
 * Example: http('handler', source.push) for direct deployment
 */

// ========================================
// Environment Schema
// ========================================

/**
 * BaseEnv - Base environment interface for dependency injection
 *
 * Sources receive all dependencies through this environment object:
 * - push: Collector push function
 * - command: Collector command function
 * - sources: Other registered sources
 * - elb: Public API function (alias for collector.push)
 *
 * Platform-specific sources extend this with their requirements
 * (e.g., window, document, fetch, req, res)
 *
 * This makes sources:
 * - Platform-agnostic (no direct dependencies)
 * - Testable (mock env for tests)
 * - Composable (share env between sources)
 */
export const BaseEnvSchema = z
  .object({
    push: z.any().describe('Collector push function'),
    command: z.any().describe('Collector command function'),
    sources: z.any().optional().describe('Map of registered source instances'),
    elb: z.any().describe('Public API function (alias for collector.push)'),
  })
  .catchall(z.unknown())
  .describe(
    'Base environment for dependency injection - platform-specific sources extend this',
  );

// ========================================
// Configuration Schema
// ========================================

/**
 * Config - Source configuration
 *
 * Extends Mapping.Config with source-specific options:
 * - consent: Required consent to process events
 * - data: Global data transformations
 * - mapping: Entity-action mapping rules
 * - policy: Pre-processing policies
 * - settings: Source-specific settings
 * - env: Environment dependencies
 * - id: Source identifier
 * - onError: Error handler
 * - disabled: Disable source
 * - primary: Primary source flag (only one can be primary)
 *
 * Generic note: settings, env, and mapping can have source-specific types
 */
export const ConfigSchema = MappingConfigSchema.extend({
  settings: GenericSettings.describe('Implementation-specific configuration'),
  env: BaseEnvSchema.optional().describe(
    'Environment dependencies (platform-specific)',
  ),
  id: createOptionalIdSchema('Source identifier (defaults to source key)'),
  onError: ErrorHandlerSchema.optional(),
  disabled: createBooleanSchema('Set to true to disable', true),
  primary: createBooleanSchema(
    'Mark as primary (only one can be primary)',
    true,
  ),
}).describe('Source configuration with mapping and environment');

/**
 * PartialConfig - Config with all fields optional
 * Used for config updates and overrides
 */
export const PartialConfigSchema = ConfigSchema.deepPartial().describe(
  'Partial source configuration with all fields deeply optional',
);

// ========================================
// Instance Schema
// ========================================

/**
 * Instance - Source instance (runtime object)
 *
 * Contains:
 * - type: Source type identifier
 * - config: Current configuration
 * - push: Push function (THE HANDLER)
 * - destroy: Cleanup function
 * - on: Lifecycle hook function
 *
 * Key concept: push IS the handler
 * The push function signature is flexible to support different platforms:
 * - Browser: push(event, data) => Promise<void>
 * - HTTP: push(req, res) => Promise<void>
 * - Cloud: push(event, context) => Promise<void>
 *
 * This flexibility allows direct deployment without wrappers:
 * - http.createServer(source.push)
 * - functions.https.onRequest(source.push)
 * - addEventListener('click', source.push)
 */
export const InstanceSchema = z
  .object({
    type: z
      .string()
      .describe('Source type identifier (e.g., "browser", "dataLayer")'),
    config: ConfigSchema.describe('Current source configuration'),
    // Push function - flexible signature, not validated
    push: z
      .any()
      .describe(
        'Push function - THE HANDLER (flexible signature for platform compatibility)',
      ),
    // Optional lifecycle methods
    destroy: z
      .any()
      .optional()
      .describe('Cleanup function called when source is removed'),
    on: z.any().optional().describe('Lifecycle hook function for event types'),
  })
  .describe('Source instance with push handler and lifecycle methods');

// ========================================
// Initialization Schemas
// ========================================

/**
 * Init - Source initialization function
 *
 * Factory function that creates a source instance:
 * (config, env) => Instance | Promise<Instance>
 *
 * Receives:
 * - config: Partial configuration
 * - env: Environment dependencies
 *
 * Returns:
 * - Source instance with push function
 *
 * The init function sets up the source (e.g., attach DOM listeners,
 * start HTTP server, subscribe to events) and returns the instance.
 */
export const InitSchema = z
  .any()
  .describe(
    'Source initialization function: (config, env) => Instance | Promise<Instance>',
  );

/**
 * InitSource - Initialization configuration
 *
 * Contains:
 * - code: Init function
 * - config: Partial config overrides
 * - env: Partial env overrides
 * - primary: Primary source flag
 */
export const InitSourceSchema = z
  .object({
    code: InitSchema.describe('Source initialization function'),
    config: PartialConfigSchema.optional().describe(
      'Partial configuration overrides',
    ),
    env: BaseEnvSchema.partial()
      .optional()
      .describe('Partial environment overrides'),
    primary: z
      .boolean()
      .optional()
      .describe('Mark as primary source (only one can be primary)'),
  })
  .describe('Source initialization configuration');

/**
 * InitSources - Map of source IDs to init configs
 */
export const InitSourcesSchema = z
  .record(z.string(), InitSourceSchema)
  .describe('Map of source IDs to initialization configurations');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const baseEnvJsonSchema = zodToJsonSchema(BaseEnvSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'SourceBaseEnv',
});

export const configJsonSchema = zodToJsonSchema(ConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'SourceConfig',
});

export const partialConfigJsonSchema = zodToJsonSchema(PartialConfigSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'PartialSourceConfig',
});

export const instanceJsonSchema = zodToJsonSchema(InstanceSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'SourceInstance',
});

export const initSourceJsonSchema = zodToJsonSchema(InitSourceSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'InitSource',
});

export const initSourcesJsonSchema = zodToJsonSchema(InitSourcesSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'relative',
  name: 'InitSources',
});
