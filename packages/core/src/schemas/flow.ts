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
 * SCHEMA SYNC: Run `npx tsx scripts/generate-flow-schema.ts` from the repo root
 * to regenerate website/static/schema/flow/v1.json and v2.json.
 *
 * @packageDocumentation
 */

import { z, toJsonSchema } from './validation';
import { RoutableNextSchema } from './matcher';
import { CacheSchema } from './cache';

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
  .meta({
    id: 'FlowPrimitive',
    title: 'Flow.Primitive',
    description: 'Primitive value: string, number, or boolean.',
  })
  .describe('Primitive value: string, number, or boolean');

// ========================================
// Shared Type Schemas
// ========================================

/**
 * Variables schema for interpolation.
 */
export const VariablesSchema = z
  .record(z.string(), PrimitiveSchema)
  .meta({
    id: 'FlowVariables',
    title: 'Flow.Variables',
    description: 'Variables for interpolation (string/number/boolean values).',
  })
  .describe('Variables for interpolation');

/**
 * Definitions schema for reusable configurations.
 */
export const DefinitionsSchema = z
  .record(
    z.string(),
    z.unknown().meta({
      id: 'FlowDefinition',
      title: 'Flow.Definition',
      description: 'Single named definition value (arbitrary shape).',
    }),
  )
  .meta({
    id: 'FlowDefinitions',
    title: 'Flow.Definitions',
    description: 'Reusable configuration definitions referenced via $def.name.',
  })
  .describe('Reusable configuration definitions');

/**
 * Packages schema for build configuration.
 */
const npmPackageNamePattern =
  /^(@[a-z0-9\-~][a-z0-9\-._~]*\/)?[a-z0-9\-~][a-z0-9\-._~]*$/;

/**
 * Single package spec — version / imports / local path triple.
 * Extracted from PackagesSchema so it renders with its canonical name in
 * the generated JSON Schema.
 */
export const FlowPackageSpecSchema = z
  .object({
    version: z.string().optional(),
    imports: z.array(z.string()).optional(),
    path: z.string().optional(), // Local path (takes precedence over version)
  })
  .meta({
    id: 'FlowPackageSpec',
    title: 'Flow.PackageSpec',
    description: 'Per-package bundle spec (version / imports / local path).',
  });

export const PackagesSchema = z
  .record(
    z.string().regex(npmPackageNamePattern, 'Invalid npm package name'),
    FlowPackageSpecSchema,
  )
  .meta({
    id: 'FlowPackages',
    title: 'Flow.Packages',
    description: 'Map of npm package names to bundle specs.',
  })
  .describe('NPM packages to bundle');

/**
 * Overrides schema — pin transitive dependency versions.
 *
 * @remarks
 * Flat `Record<string, string>` matching npm's `overrides` semantics.
 * Only affects transitive deps; direct package specs always win.
 */
export const OverridesSchema = z
  .record(
    z.string().regex(npmPackageNamePattern, 'Invalid npm package name'),
    z.string().min(1, 'Override version cannot be empty'),
  )
  .meta({
    id: 'FlowOverrides',
    title: 'Flow.Overrides',
    description: 'Transitive dependency version overrides (flat record).',
  })
  .describe('Transitive dependency version overrides');

/**
 * Bundle schema — build-time configuration for the bundler.
 */
export const BundleSchema = z
  .object({
    packages: PackagesSchema.optional().describe('NPM packages to bundle'),
    overrides: OverridesSchema.optional().describe(
      'Transitive dependency overrides',
    ),
  })
  .strict()
  .meta({
    id: 'FlowBundle',
    title: 'Flow.Bundle',
    description: 'Bundle configuration (packages + overrides).',
  })
  .describe('Bundle configuration (packages + overrides)');

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
      .default('collector')
      .optional()
      .describe(
        'Window property name for the collector instance (default: "collector")',
      ),
    windowElb: z
      .string()
      .default('elb')
      .optional()
      .describe(
        'Window property name for the elb command queue (default: "elb")',
      ),
  })
  .meta({
    id: 'FlowWeb',
    title: 'Flow.Web',
    description: 'Web platform configuration (browser-based tracking).',
  })
  .describe('Web platform configuration');

/**
 * Server platform configuration schema.
 */
export const ServerSchema = z
  .object({})
  .passthrough()
  .meta({
    id: 'FlowServer',
    title: 'Flow.Server',
    description:
      'Server platform configuration (Node.js) — reserved for future options.',
  })
  .describe('Server platform configuration (reserved for future options)');

// ========================================
// Inline Code Schema
// ========================================

/**
 * Inline code schema for embedding JavaScript functions in JSON configs.
 *
 * @remarks
 * Enables custom sources, transformers, and destinations without npm packages.
 * The `push` function is required; `type` and `init` are optional.
 *
 * @example
 * ```json
 * {
 *   "code": {
 *     "type": "enricher",
 *     "push": "$code:(event) => ({ ...event, data: { ...event.data, enriched: true } })"
 *   }
 * }
 * ```
 */
export const InlineCodeSchema = z
  .object({
    push: z
      .string()
      .min(1, 'Push function cannot be empty')
      .describe(
        'JavaScript function for processing events. Must start with "$code:" prefix. Example: "$code:(event) => { console.log(event); }"',
      ),
    type: z
      .string()
      .optional()
      .describe('Optional type identifier for the inline instance'),
    init: z
      .string()
      .optional()
      .describe(
        'Optional initialization function. Use $code: prefix for inline JavaScript.',
      ),
  })
  .meta({
    id: 'FlowInlineCode',
    title: 'Flow.InlineCode',
    description:
      'Inline code block for custom sources / transformers / destinations — declared directly in JSON configs.',
  })
  .describe('Inline code for custom sources/transformers/destinations');

// ========================================
// Step Example Schemas
// ========================================

/**
 * Step example schema — a named { in, out } pair.
 */
/**
 * Trigger descriptor — source trigger metadata for step examples.
 * Extracted from inline StepExampleSchema.trigger so it renders as
 * `Trigger.Descriptor` in PropertyTable.
 */
export const TriggerDescriptorSchema = z
  .object({
    type: z
      .string()
      .optional()
      .describe('Trigger mechanism (e.g., click, POST, load)'),
    options: z.unknown().optional().describe('Mechanism-specific options'),
  })
  .meta({
    id: 'TriggerDescriptor',
    title: 'Trigger.Descriptor',
    description:
      'Source trigger metadata (mechanism + options) used by step examples.',
  });

export const StepExampleSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe('Human-readable title (overrides default heading)'),
    description: z.string().optional().describe('Human-readable description'),
    public: z
      .boolean()
      .optional()
      .describe(
        'Whether this example is shown in docs/UI/MCP default output (default: true). Set false for test-only fixtures.',
      ),
    in: z.unknown().optional().describe('Input to the step'),
    trigger: TriggerDescriptorSchema.optional().describe(
      'Source trigger metadata',
    ),
    mapping: z.unknown().optional().describe('Mapping configuration'),
    out: z.unknown().optional().describe('Expected output from the step'),
    command: z
      .enum(['config', 'consent', 'user', 'run'])
      .optional()
      .describe(
        "Invoke elb('walker <command>', in) instead of pushing in as an event",
      ),
  })
  .meta({
    id: 'FlowStepExample',
    title: 'Flow.StepExample',
    description: 'Named example with input/output pair used for step testing.',
  })
  .describe('Named example with input/output pair');

/**
 * Step examples record — keyed by scenario name.
 */
export const StepExamplesSchema = z
  .record(z.string(), StepExampleSchema)
  .meta({
    id: 'FlowStepExamples',
    title: 'Flow.StepExamples',
    description: 'Named step examples keyed by scenario name.',
  })
  .describe('Named step examples for testing and documentation');

// ========================================
// Source Reference Schema
// ========================================

/**
 * Source reference schema.
 *
 * @remarks
 * Defines how to reference and configure a source package.
 * Sources capture events from various origins (browser, HTTP, etc.).
 * Either `package` (npm package) or `code` (inline object) must be provided, but not both.
 */
export const SourceReferenceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")',
      ),
    code: z
      .union([z.string(), InlineCodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "sourceExpress") or an inline code object with push function',
      ),
    config: z
      .unknown()
      .meta({
        id: 'FlowSourceReferenceConfig',
        title: 'Source.Config',
        description: 'Source-specific configuration object (Source.Config).',
      })
      .optional()
      .describe('Source-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowSourceReferenceEnv',
        title: 'Source.BaseEnv',
        description:
          'Source environment configuration (Source.BaseEnv overrides).',
      })
      .optional()
      .describe('Source environment configuration'),
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
    next: RoutableNextSchema.optional().describe(
      'Pre-collector transformer chain. String, string[], or NextRule[] for conditional routing based on ingest data.',
    ),
    before: RoutableNextSchema.optional().describe(
      'Pre-source transformer chain (consent-exempt). Handles transport-level preprocessing.',
    ),
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
    cache: CacheSchema.optional().describe(
      'Cache configuration for this source (match → key → ttl rules)',
    ),
  })
  .meta({
    id: 'FlowSourceReference',
    title: 'Flow.SourceReference',
    description:
      'Source package reference with configuration, env, chains, and examples.',
  })
  .describe('Source package reference with configuration');

// ========================================
// Transformer Reference Schema
// ========================================

/**
 * Transformer reference schema.
 *
 * @remarks
 * Defines how to reference and configure a transformer package.
 * Transformers transform events in the pipeline between sources and destinations.
 */
export const TransformerReferenceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/transformer-enricher@1.0.0")',
      ),
    code: z
      .union([z.string(), InlineCodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "transformerEnricher") or an inline code object with push function',
      ),
    config: z
      .unknown()
      .meta({
        id: 'FlowTransformerReferenceConfig',
        title: 'Transformer.Config',
        description: 'Transformer-specific configuration object.',
      })
      .optional()
      .describe('Transformer-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowTransformerReferenceEnv',
        title: 'Transformer.Env',
        description: 'Transformer environment configuration.',
      })
      .optional()
      .describe('Transformer environment configuration'),
    before: RoutableNextSchema.optional().describe(
      'Pre-transformer chain. Runs before this transformer push function.',
    ),
    next: RoutableNextSchema.optional().describe(
      'Next transformer in chain. String, string[], or NextRule[] for conditional routing.',
    ),
    variables: VariablesSchema.optional().describe(
      'Transformer-level variables (highest priority in cascade)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Transformer-level definitions (highest priority in cascade)',
    ),
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
    cache: CacheSchema.optional().describe(
      'Cache configuration for this transformer (match → key → ttl rules)',
    ),
  })
  .meta({
    id: 'FlowTransformerReference',
    title: 'Flow.TransformerReference',
    description:
      'Transformer package reference with configuration, env, chains, and cache.',
  })
  .describe('Transformer package reference with configuration');

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
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")',
      ),
    code: z
      .union([z.string(), InlineCodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "destinationAnalytics") or an inline code object with push function',
      ),
    config: z
      .unknown()
      .meta({
        id: 'FlowDestinationReferenceConfig',
        title: 'Destination.Config',
        description: 'Destination-specific configuration object.',
      })
      .optional()
      .describe('Destination-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowDestinationReferenceEnv',
        title: 'Destination.Env',
        description: 'Destination environment configuration.',
      })
      .optional()
      .describe('Destination environment configuration'),
    variables: VariablesSchema.optional().describe(
      'Destination-level variables (highest priority in cascade)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Destination-level definitions (highest priority in cascade)',
    ),
    before: RoutableNextSchema.optional().describe(
      'Post-collector transformer chain. String, string[], or NextRule[] for conditional routing.',
    ),
    next: RoutableNextSchema.optional().describe(
      'Post-push transformer chain. Push response available at context.ingest._response.',
    ),
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
    cache: CacheSchema.optional().describe(
      'Cache configuration for this destination (match → key → ttl rules)',
    ),
  })
  .meta({
    id: 'FlowDestinationReference',
    title: 'Flow.DestinationReference',
    description:
      'Destination package reference with configuration, env, chains, and cache.',
  })
  .describe('Destination package reference with configuration');

/**
 * Store package reference.
 *
 * @remarks
 * Stores are passive key-value infrastructure — no chain properties (next/before).
 * Consumed by other components via `$store.storeId` env wiring.
 */
export const StoreReferenceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe('Store package specifier with optional version'),
    code: z
      .union([z.string(), InlineCodeSchema])
      .optional()
      .describe('Named export string or inline code definition'),
    config: z
      .unknown()
      .meta({
        id: 'FlowStoreReferenceConfig',
        title: 'Store.Config',
        description: 'Store-specific configuration object.',
      })
      .optional()
      .describe('Store-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowStoreReferenceEnv',
        title: 'Store.Env',
        description: 'Store environment configuration.',
      })
      .optional()
      .describe('Store environment configuration'),
    variables: VariablesSchema.optional().describe(
      'Store-level variables (highest priority in cascade)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Store-level definitions (highest priority in cascade)',
    ),
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
  })
  .meta({
    id: 'FlowStoreReference',
    title: 'Flow.StoreReference',
    description:
      'Store package reference with configuration, env, and examples.',
  })
  .describe('Store package reference with configuration');

// ========================================
// Contract Schemas
// ========================================

/**
 * Contract schema entry — a JSON Schema object.
 * Passthrough to allow any valid JSON Schema keywords.
 */
export const ContractSchemaEntry = z
  .record(z.string(), z.unknown())
  .meta({
    id: 'FlowContractSchemaEntry',
    title: 'Flow.ContractSchemaEntry',
    description:
      'JSON Schema object for event validation with description/examples annotations.',
  })
  .describe(
    'JSON Schema object for event validation with description/examples annotations',
  );

/**
 * Contract actions — keyed by action name (or "*" wildcard).
 */
export const ContractActionsSchema = z
  .record(z.string(), ContractSchemaEntry)
  .meta({
    id: 'FlowContractActions',
    title: 'Flow.ContractActions',
    description: 'Action-level contract entries keyed by action name.',
  })
  .describe('Action-level contract entries');

/**
 * Contract events map — entity → action keyed.
 */
export const ContractEventsSchema = z
  .record(z.string(), ContractActionsSchema)
  .meta({
    id: 'FlowContractEvents',
    title: 'Flow.ContractEvents',
    description: 'Entity-action event schemas (entity → action → schema).',
  })
  .describe('Entity-action event schemas');

/**
 * Single named contract entry.
 */
export const ContractEntrySchema = z
  .object({
    extends: z
      .string()
      .optional()
      .describe('Inherit from another named contract'),
    tagging: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Contract version number'),
    description: z.string().optional().describe('Human-readable description'),
    globals: ContractSchemaEntry.optional().describe(
      'JSON Schema for event.globals',
    ),
    context: ContractSchemaEntry.optional().describe(
      'JSON Schema for event.context',
    ),
    custom: ContractSchemaEntry.optional().describe(
      'JSON Schema for event.custom',
    ),
    user: ContractSchemaEntry.optional().describe('JSON Schema for event.user'),
    consent: ContractSchemaEntry.optional().describe(
      'JSON Schema for event.consent',
    ),
    events: ContractEventsSchema.optional().describe(
      'Entity-action event schemas',
    ),
  })
  .meta({
    id: 'FlowContractEntry',
    title: 'Flow.ContractEntry',
    description:
      'Named contract entry with optional sections (globals/context/custom/user/consent) and event schemas.',
  })
  .describe('Named contract entry with optional sections and events');

/**
 * Named contract map.
 */
export const ContractSchema = z
  .record(z.string(), ContractEntrySchema)
  .meta({
    id: 'FlowContract',
    title: 'Flow.Contract',
    description: 'Named contracts map with optional extends inheritance.',
  })
  .describe('Named contracts with optional extends inheritance');

// ========================================
// Flow Settings Schema (Single Flow)
// ========================================

/**
 * Single flow settings schema.
 *
 * @remarks
 * Represents a single deployment target (e.g., web_prod, server_stage).
 * Platform is determined by presence of `web` or `server` key.
 * Exactly one must be present.
 */
export const SettingsSchema = z
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
    transformers: z
      .record(z.string(), TransformerReferenceSchema)
      .optional()
      .describe(
        'Transformer configurations (event transformation) keyed by unique identifier',
      ),
    stores: z
      .record(z.string(), StoreReferenceSchema)
      .optional()
      .describe(
        'Store configurations (key-value storage) keyed by unique identifier',
      ),
    collector: z
      .unknown()
      .meta({
        id: 'FlowSettingsCollector',
        title: 'Collector.InitConfig',
        description:
          'Collector configuration for event processing (Collector.InitConfig).',
      })
      .optional()
      .describe(
        'Collector configuration for event processing (uses Collector.InitConfig)',
      ),
    bundle: BundleSchema.optional().describe(
      'Build-time configuration (packages + overrides)',
    ),
    packages: z
      .unknown()
      .optional()
      .refine((val) => val === undefined, {
        message:
          '`packages` must live under `bundle.packages`. ' +
          'Move your packages block to `flow.<name>.bundle.packages`. ' +
          'This is a breaking change — see CHANGELOG migration guide.',
      })
      .describe('Legacy top-level packages (moved to bundle.packages)'),
    variables: VariablesSchema.optional().describe(
      'Flow-level variables (override Config.variables, overridden by source/destination variables)',
    ),
    definitions: DefinitionsSchema.optional().describe(
      'Flow-level definitions (extend Config.definitions, overridden by source/destination definitions)',
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
  .meta({
    id: 'FlowSettings',
    title: 'Flow.Settings',
    description:
      'Single flow settings for one deployment target (web/server, sources, destinations, transformers, stores, collector, bundle).',
  })
  .describe('Single flow settings for one deployment target');

// ========================================
// Flow Config Schema (Root Configuration)
// ========================================

/**
 * Flow config schema - root configuration.
 *
 * @remarks
 * This is the complete schema for walkeros.config.json files.
 * Contains multiple named flows with shared variables and definitions.
 */
const ConfigBaseSchema = z.object({
  $schema: z
    .string()
    .url('Schema URL must be a valid URL')
    .optional()
    .describe(
      'JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v2.json")',
    ),
  include: z
    .array(z.string())
    .optional()
    .describe('Folders to include in the bundle output'),
  variables: VariablesSchema.optional().describe(
    'Shared variables for interpolation across all flows (use $var.name syntax)',
  ),
  definitions: DefinitionsSchema.optional().describe(
    'Reusable configuration definitions (use $def.name syntax)',
  ),
  flows: z
    .record(z.string(), SettingsSchema)
    .refine((flows) => Object.keys(flows).length > 0, {
      message: 'At least one flow is required',
    })
    .describe(
      'Named flow configurations (e.g., production, staging, development)',
    ),
});

export const ConfigSchema = ConfigBaseSchema.extend({
  version: z.literal(3).describe('Configuration schema version'),
  contract: ContractSchema.optional().describe(
    'Named contracts with extends inheritance and dot-path references',
  ),
})
  .meta({
    id: 'FlowConfig',
    title: 'Flow.Config',
    description:
      'walkerOS flow configuration root (walkeros.config.json) with version, variables, definitions, contract and named flows.',
  })
  .describe('walkerOS flow configuration (walkeros.config.json)');

// ========================================
// Helper Functions
// ========================================

/**
 * Parse and validate Flow.Config configuration.
 *
 * @param data - Raw JSON data from config file
 * @returns Validated Flow.Config object
 * @throws ZodError if validation fails with detailed error messages
 *
 * @example
 * ```typescript
 * import { parseConfig } from '@walkeros/core/dev';
 * import { readFileSync } from 'fs';
 *
 * const raw = JSON.parse(readFileSync('walkeros.config.json', 'utf8'));
 * const config = parseConfig(raw);
 * console.log(`Found ${Object.keys(config.flows).length} flows`);
 * ```
 */
export function parseConfig(data: unknown): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse(data);
}

/**
 * Safely parse Flow.Config configuration without throwing.
 *
 * @param data - Raw JSON data from config file
 * @returns Success result with data or error result with issues
 *
 * @example
 * ```typescript
 * import { safeParseConfig } from '@walkeros/core/dev';
 *
 * const result = safeParseConfig(rawData);
 * if (result.success) {
 *   console.log('Valid config:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error.issues);
 * }
 * ```
 */
export function safeParseConfig(data: unknown) {
  return ConfigSchema.safeParse(data);
}

/**
 * Parse and validate Flow.Settings (single flow).
 *
 * @param data - Raw JSON data for single flow
 * @returns Validated Flow.Settings object
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * import { parseSettings } from '@walkeros/core/dev';
 *
 * const flowSettings = parseSettings(rawFlowData);
 * console.log(`Platform: ${flowSettings.web ? 'web' : 'server'}`);
 * ```
 */
export function parseSettings(data: unknown): z.infer<typeof SettingsSchema> {
  return SettingsSchema.parse(data);
}

/**
 * Safely parse Flow.Settings without throwing.
 *
 * @param data - Raw JSON data for single flow
 * @returns Success result with data or error result with issues
 */
export function safeParseSettings(data: unknown) {
  return SettingsSchema.safeParse(data);
}

// ========================================
// JSON Schema Generation
// ========================================

/**
 * Generate JSON Schema for Flow.Config.
 *
 * @remarks
 * Used for IDE validation and autocomplete.
 * Hosted at https://walkeros.io/schema/flow/v3.json
 *
 * @returns JSON Schema (Draft 7) representation of ConfigSchema
 */
export const configJsonSchema = z.toJSONSchema(ConfigSchema, {
  target: 'draft-7',
});

/**
 * Generate JSON Schema for Flow.Settings.
 *
 * @remarks
 * Used for validating individual flow settings.
 *
 * @returns JSON Schema (Draft 7) representation of SettingsSchema
 */
export const settingsJsonSchema = toJsonSchema(SettingsSchema, 'FlowSettings');

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

/**
 * Generate JSON Schema for TransformerReference.
 *
 * @remarks
 * Used for validating transformer package references.
 *
 * @returns JSON Schema (Draft 7) representation of TransformerReferenceSchema
 */
export const transformerReferenceJsonSchema = toJsonSchema(
  TransformerReferenceSchema,
  'TransformerReference',
);

/**
 * Generate JSON Schema for StoreReference.
 *
 * @remarks
 * Used for validating store package references.
 *
 * @returns JSON Schema (Draft 7) representation of StoreReferenceSchema
 */
export const storeReferenceJsonSchema = toJsonSchema(
  StoreReferenceSchema,
  'StoreReference',
);

/**
 * Generate JSON Schema for ContractEntry.
 *
 * @remarks
 * Used for validating individual contract entries.
 *
 * @returns JSON Schema (Draft 7) representation of ContractEntrySchema
 */
export const contractEntryJsonSchema = toJsonSchema(
  ContractEntrySchema,
  'ContractEntry',
);

/**
 * Generate JSON Schema for Contract.
 *
 * @remarks
 * Used for validating named contract maps.
 *
 * @returns JSON Schema (Draft 7) representation of ContractSchema
 */
export const contractJsonSchema = toJsonSchema(ContractSchema, 'Contract');
