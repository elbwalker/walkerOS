import { z, toJsonSchema } from './validation';
import {
  ConfigSchema as MappingConfigSchema,
  ValueSchema,
  ValuesSchema,
} from './mapping';
import { Identifier } from './primitives';
import { LoggerConfigSchema } from './logger';

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
    push: z
      .unknown()
      .meta({
        id: 'SourcePushFn',
        title: 'Source.PushFn',
        description:
          'Collector push function passed to the source via dependency injection.',
      })
      .describe('Collector push function'),
    command: z
      .unknown()
      .meta({
        id: 'SourceCommandFn',
        title: 'Source.CommandFn',
        description: 'Collector command function passed to the source.',
      })
      .describe('Collector command function'),
    sources: z
      .unknown()
      .optional()
      .describe('Map of registered source instances'),
    elb: z
      .unknown()
      .meta({
        id: 'ElbFn',
        title: 'Elb.Fn',
        description: 'Public `elb(...)` API function alias for collector.push.',
      })
      .describe('Public API function (alias for collector.push)'),
  })
  .catchall(z.unknown())
  .meta({
    id: 'SourceBaseEnv',
    title: 'Source.BaseEnv',
    description:
      'Base environment for source dependency injection; platform-specific sources extend this.',
  })
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
 * - primary: Primary source flag (only one can be primary)
 *
 * Generic note: settings, env, and mapping can have source-specific types
 */
export const ConfigSchema = MappingConfigSchema.extend({
  settings: z
    .any()
    .meta({
      id: 'SourceSettings',
      title: 'Source.Settings',
      description:
        'Implementation-specific configuration (source-defined shape).',
    })
    .describe('Implementation-specific configuration')
    .optional(),
  env: BaseEnvSchema.optional().describe(
    'Environment dependencies (platform-specific)',
  ),
  id: Identifier.describe(
    'Source identifier (defaults to source key)',
  ).optional(),
  primary: z
    .boolean()
    .describe('Mark as primary (only one can be primary)')
    .optional(),
  require: z
    .array(z.string())
    .optional()
    .describe(
      'Defer source initialization until these collector events fire (e.g., ["consent"])',
    ),
  logger: LoggerConfigSchema.optional().describe(
    'Logger configuration (level, handler) to override the collector defaults',
  ),
  ingest: z
    .union([ValueSchema, ValuesSchema])
    .optional()
    .describe(
      'Ingest metadata extraction mapping. Extracts values from raw request objects (Express req, Lambda event) using mapping syntax.',
    ),
  disabled: z
    .boolean()
    .describe('Completely skip this source (no init, no event capture)')
    .optional(),
})
  .meta({
    id: 'SourceConfig',
    title: 'Source.Config',
    description:
      'Source configuration with mapping, environment, and lifecycle hooks.',
  })
  .describe('Source configuration with mapping and environment');

/**
 * PartialConfig - Config with all fields optional
 * Used for config updates and overrides
 *
 * Note: ConfigSchema extends MappingConfigSchema with mostly optional fields.
 * Using .partial() ensures all fields are optional for config updates.
 */
export const PartialConfigSchema = ConfigSchema.partial()
  .meta({
    id: 'SourcePartialConfig',
    title: 'Source.PartialConfig',
    description: 'Partial source configuration with all fields optional.',
  })
  .describe('Partial source configuration with all fields optional');

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
      .meta({
        id: 'SourceInstancePushFn',
        title: 'Source.PushFn',
        description:
          'Push function — THE HANDLER (flexible signature for platform compatibility).',
      })
      .describe(
        'Push function - THE HANDLER (flexible signature for platform compatibility)',
      ),
    // Optional lifecycle methods
    destroy: z
      .any()
      .meta({
        id: 'SourceDestroyFn',
        title: 'Source.DestroyFn',
        description: 'Cleanup function called when the source is removed.',
      })
      .optional()
      .describe('Cleanup function called when source is removed'),
    on: z
      .unknown()
      .optional()
      .describe('Lifecycle hook function for event types'),
  })
  .meta({
    id: 'SourceInstance',
    title: 'Source.Instance',
    description:
      'Source instance (runtime object with push handler and lifecycle methods).',
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
  .meta({
    id: 'SourceInit',
    title: 'Source.Init',
    description:
      'Source initialization function: (config, env) => Instance | Promise<Instance>.',
  })
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
  .meta({
    id: 'SourceInitSource',
    title: 'Source.InitSource',
    description:
      'Source initialization bundle (init function + config + env + primary flag).',
  })
  .describe('Source initialization configuration');

/**
 * InitSources - Map of source IDs to init configs
 */
export const InitSourcesSchema = z
  .record(z.string(), InitSourceSchema)
  .meta({
    id: 'SourceInitSources',
    title: 'Source.InitSources',
    description: 'Map of source IDs to initialization configurations.',
  })
  .describe('Map of source IDs to initialization configurations');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const baseEnvJsonSchema = toJsonSchema(BaseEnvSchema, 'SourceBaseEnv');

export const configJsonSchema = toJsonSchema(ConfigSchema, 'SourceConfig');

export const partialConfigJsonSchema = toJsonSchema(
  PartialConfigSchema,
  'PartialSourceConfig',
);

export const instanceJsonSchema = toJsonSchema(
  InstanceSchema,
  'SourceInstance',
);

export const initSourceJsonSchema = toJsonSchema(
  InitSourceSchema,
  'InitSource',
);

export const initSourcesJsonSchema = toJsonSchema(
  InitSourcesSchema,
  'InitSources',
);
