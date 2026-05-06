/**
 * Flow Configuration System - Zod Schemas (v4)
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
 * to regenerate website/static/schema/flow/v4.json.
 *
 * @packageDocumentation
 */

import { z, toJsonSchema } from './validation';
import { RoutableNextSchema } from './matcher';
import { CacheSchema } from './cache';

// ========================================
// Shared Type Schemas
// ========================================

/**
 * Variables schema for unified $var. interpolation.
 *
 * @remarks
 * Variables can hold any value (scalars, objects, arrays). Whole-string $var
 * references preserve native type; inline interpolation requires scalars.
 * Deep paths via `$var.name.deep.path` are supported.
 */
export const VariablesSchema = z.record(z.string(), z.unknown()).meta({
  id: 'FlowVariables',
  title: 'Flow.Variables',
  description:
    'Reusable values referenced via $var.name (with optional deep paths). Whole-string refs preserve native type; inline interpolation requires scalars.',
});

/**
 * Settings schema - free-form key-value bag inside Flow.Config.settings.
 */
export const SettingsSchema = z
  .record(z.string(), z.unknown())
  .meta({
    id: 'FlowSettings',
    title: 'Flow.Settings',
    description:
      'Free-form key-value settings consumed by the platform runtime.',
  })
  .describe('Free-form platform settings bag');

/**
 * NPM package name validation pattern.
 */
const npmPackageNamePattern =
  /^(@[a-z0-9\-~][a-z0-9\-._~]*\/)?[a-z0-9\-~][a-z0-9\-._~]*$/;

/**
 * Single bundle package entry.
 */
export const BundlePackageSchema = z
  .object({
    version: z.string().optional(),
    imports: z.array(z.string()).optional(),
    path: z.string().optional(), // Local path (takes precedence over version)
  })
  .meta({
    id: 'FlowBundlePackage',
    title: 'Flow.BundlePackage',
    description: 'Per-package bundle spec (version / imports / local path).',
  });

/**
 * Bundle schema - build-time configuration for the bundler.
 */
export const BundleSchema = z
  .object({
    packages: z
      .record(
        z.string().regex(npmPackageNamePattern, 'Invalid npm package name'),
        BundlePackageSchema,
      )
      .optional()
      .describe('NPM packages to bundle, keyed by package name'),
    overrides: z
      .record(
        z.string().regex(npmPackageNamePattern, 'Invalid npm package name'),
        z.string().min(1, 'Override version cannot be empty'),
      )
      .optional()
      .describe('Transitive dependency version pins'),
  })
  .strict()
  .meta({
    id: 'FlowBundle',
    title: 'Flow.Bundle',
    description: 'Bundle configuration (packages + overrides).',
  })
  .describe('Bundle configuration (packages + overrides)');

// ========================================
// Inline Code Schema
// ========================================

/**
 * Inline code schema for embedding JavaScript functions in JSON configs.
 *
 * @remarks
 * Enables custom sources, transformers, destinations, and stores without
 * npm packages. The `push` function is required; `type` and `init` are optional.
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
export const CodeSchema = z
  .object({
    push: z
      .string()
      .min(1, 'Push function cannot be empty')
      .describe(
        'JavaScript function for processing events. Must start with "$code:" prefix.',
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
    id: 'FlowCode',
    title: 'Flow.Code',
    description:
      'Inline code block for custom sources / transformers / destinations / stores.',
  })
  .describe('Inline code for custom components');

// ========================================
// Step Example Schemas
// ========================================

/**
 * Trigger descriptor - source trigger metadata for step examples.
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

/**
 * Step example schema - a named { in, out } pair.
 */
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
 * Step examples record - keyed by scenario name.
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
// Source / Destination / Transformer / Store Schemas
// ========================================

/**
 * Source reference schema (Flow.Source).
 *
 * @remarks
 * Defines how to reference and configure a source package.
 * Sources capture events from various origins (browser, HTTP, etc.).
 * Either `package` (npm package) or `code` (inline object) may be provided.
 */
export const SourceSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")',
      ),
    code: z
      .union([z.string(), CodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "sourceExpress") or an inline code object with push function',
      ),
    config: z
      .looseObject({
        setup: z
          .union([z.boolean(), z.record(z.string(), z.unknown())])
          .optional()
          .describe(
            'One-time setup options applied during source registration (boolean enables defaults, object configures specifics)',
          ),
      })
      .meta({
        id: 'FlowSourceConfig',
        title: 'Source.Config',
        description: 'Source-specific configuration object (Source.Config).',
      })
      .optional()
      .describe('Source-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowSourceEnv',
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
    id: 'FlowSource',
    title: 'Flow.Source',
    description:
      'Source package reference with configuration, env, chains, and examples.',
  })
  .describe('Source package reference with configuration');

/**
 * Transformer reference schema (Flow.Transformer).
 */
export const TransformerSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/transformer-enricher@1.0.0")',
      ),
    code: z
      .union([z.string(), CodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "transformerEnricher") or an inline code object with push function',
      ),
    config: z
      .unknown()
      .meta({
        id: 'FlowTransformerConfig',
        title: 'Transformer.Config',
        description: 'Transformer-specific configuration object.',
      })
      .optional()
      .describe('Transformer-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowTransformerEnv',
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
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
    cache: CacheSchema.optional().describe(
      'Cache configuration for this transformer (match → key → ttl rules)',
    ),
  })
  .meta({
    id: 'FlowTransformer',
    title: 'Flow.Transformer',
    description:
      'Transformer package reference with configuration, env, chains, and cache.',
  })
  .describe('Transformer package reference with configuration');

/**
 * Destination reference schema (Flow.Destination).
 */
export const DestinationSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe(
        'Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")',
      ),
    code: z
      .union([z.string(), CodeSchema])
      .optional()
      .describe(
        'Either a named export string (e.g., "destinationAnalytics") or an inline code object with push function',
      ),
    config: z
      .looseObject({
        setup: z
          .union([z.boolean(), z.record(z.string(), z.unknown())])
          .optional()
          .describe(
            'One-time setup options applied during destination registration (boolean enables defaults, object configures specifics)',
          ),
      })
      .meta({
        id: 'FlowDestinationConfig',
        title: 'Destination.Config',
        description: 'Destination-specific configuration object.',
      })
      .optional()
      .describe('Destination-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowDestinationEnv',
        title: 'Destination.Env',
        description: 'Destination environment configuration.',
      })
      .optional()
      .describe('Destination environment configuration'),
    variables: VariablesSchema.optional().describe(
      'Destination-level variables (highest priority in cascade)',
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
    id: 'FlowDestination',
    title: 'Flow.Destination',
    description:
      'Destination package reference with configuration, env, chains, and cache.',
  })
  .describe('Destination package reference with configuration');

/**
 * Store reference schema (Flow.Store).
 *
 * @remarks
 * Stores are passive key-value infrastructure - no chain properties (next/before).
 * Consumed by other components via `$store.storeId` env wiring.
 */
export const StoreSchema = z
  .object({
    package: z
      .string()
      .min(1, 'Package name cannot be empty')
      .optional()
      .describe('Store package specifier with optional version'),
    code: z
      .union([z.string(), CodeSchema])
      .optional()
      .describe('Named export string or inline code definition'),
    config: z
      .looseObject({
        setup: z
          .union([z.boolean(), z.record(z.string(), z.unknown())])
          .optional()
          .describe(
            'One-time setup options applied during store registration (boolean enables defaults, object configures specifics)',
          ),
      })
      .meta({
        id: 'FlowStoreConfig',
        title: 'Store.Config',
        description: 'Store-specific configuration object.',
      })
      .optional()
      .describe('Store-specific configuration object'),
    env: z
      .unknown()
      .meta({
        id: 'FlowStoreEnv',
        title: 'Store.Env',
        description: 'Store environment configuration.',
      })
      .optional()
      .describe('Store environment configuration'),
    variables: VariablesSchema.optional().describe(
      'Store-level variables (highest priority in cascade)',
    ),
    examples: StepExamplesSchema.optional().describe(
      'Named step examples for testing and documentation (stripped during bundling)',
    ),
  })
  .meta({
    id: 'FlowStore',
    title: 'Flow.Store',
    description:
      'Store package reference with configuration, env, and examples.',
  })
  .describe('Store package reference with configuration');

// ========================================
// Contract Schemas
// ========================================

/**
 * Contract schema entry - a JSON Schema object.
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
 * Contract actions - keyed by action name (or "*" wildcard).
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
 * Contract events map - entity → action keyed.
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
 * Single named contract rule.
 */
export const ContractRuleSchema = z
  .object({
    extends: z
      .string()
      .optional()
      .describe('Inherit from another named contract'),
    tagging: z
      .number()
      .optional()
      .describe('Tagging level (used by validators / runtime tagging policy)'),
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
    id: 'FlowContractRule',
    title: 'Flow.ContractRule',
    description:
      'Named contract rule with optional sections (globals/context/custom/user/consent) and event schemas.',
  })
  .describe('Named contract rule with optional sections and events');

/**
 * Named contract map.
 */
export const ContractSchema = z
  .record(z.string(), ContractRuleSchema)
  .meta({
    id: 'FlowContract',
    title: 'Flow.Contract',
    description: 'Named contracts map with optional extends inheritance.',
  })
  .describe('Named contracts with optional extends inheritance');

// ========================================
// Per-flow Config block + Single Flow
// ========================================

/**
 * Per-flow Config schema (Flow.Config).
 *
 * @remarks
 * Groups platform identity, optional public URL, free-form settings bag,
 * and bundle (build-time) configuration.
 */
export const ConfigSchema = z
  .object({
    platform: z
      .enum(['web', 'server'])
      .describe(
        'Platform identity for this flow. Drives bundle target/format.',
      ),
    url: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Public URL where this flow is reachable (for cross-flow $flow.X.url references).',
      ),
    settings: SettingsSchema.optional().describe(
      'Free-form key-value settings consumed by the platform runtime.',
    ),
    bundle: BundleSchema.optional().describe(
      'Bundle configuration: NPM packages, transitive dependency overrides.',
    ),
  })
  .meta({
    id: 'FlowConfig',
    title: 'Flow.Config',
    description:
      'Per-flow configuration block: platform identity, optional public URL, settings, bundle.',
  })
  .describe('Per-flow configuration block');

/**
 * Single flow schema (Flow).
 *
 * @remarks
 * Represents one deployment target (e.g., web_prod, server_stage).
 * The platform is determined by `config.platform`.
 */
export const FlowSchema = z
  .object({
    config: ConfigSchema.optional().describe(
      'Per-flow configuration: platform, url, settings, bundle.',
    ),
    sources: z
      .record(z.string(), SourceSchema)
      .optional()
      .describe(
        'Source configurations (data capture) keyed by unique identifier',
      ),
    destinations: z
      .record(z.string(), DestinationSchema)
      .optional()
      .describe(
        'Destination configurations (data output) keyed by unique identifier',
      ),
    transformers: z
      .record(z.string(), TransformerSchema)
      .optional()
      .describe(
        'Transformer configurations (event transformation) keyed by unique identifier',
      ),
    stores: z
      .record(z.string(), StoreSchema)
      .optional()
      .describe(
        'Store configurations (key-value storage) keyed by unique identifier',
      ),
    collector: z
      .unknown()
      .meta({
        id: 'FlowCollector',
        title: 'Collector.InitConfig',
        description:
          'Collector configuration for event processing (Collector.InitConfig).',
      })
      .optional()
      .describe(
        'Collector configuration for event processing (uses Collector.InitConfig)',
      ),
    variables: VariablesSchema.optional().describe(
      'Flow-level variables (override root variables, overridden by source/destination variables)',
    ),
  })
  .meta({
    id: 'Flow',
    title: 'Flow',
    description:
      'Single flow definition (one deployment target): config, sources, destinations, transformers, stores, collector.',
  })
  .describe('Single flow definition for one deployment target');

// ========================================
// Root Json Schema (walkeros.config.json)
// ========================================

/**
 * Root walkerOS multi-flow configuration schema (Flow.Json, v4).
 *
 * @remarks
 * This is the complete schema for walkeros.config.json files.
 * Contains multiple named flows with shared variables and contracts.
 */
export const JsonSchema = z
  .object({
    version: z
      .literal(4)
      .describe('Configuration schema version (v4, current).'),
    $schema: z
      .string()
      .url('Schema URL must be a valid URL')
      .optional()
      .describe(
        'JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v4.json")',
      ),
    include: z
      .array(z.string())
      .optional()
      .describe('Folders to include in the bundle output'),
    variables: VariablesSchema.optional().describe(
      'Shared variables for interpolation across all flows (use $var.name syntax, deep paths supported)',
    ),
    contract: ContractSchema.optional().describe(
      'Named contracts with extends inheritance and dot-path references',
    ),
    flows: z
      .record(z.string(), FlowSchema)
      .refine((flows) => Object.keys(flows).length > 0, {
        message: 'At least one flow is required',
      })
      .describe(
        'Named flow configurations (e.g., production, staging, development)',
      ),
  })
  .meta({
    id: 'FlowJson',
    title: 'Flow.Json',
    description:
      'walkerOS root configuration (walkeros.config.json) v4: version, variables, contract, named flows.',
  })
  .describe('walkerOS root configuration (walkeros.config.json)');

// ========================================
// Helper Functions
// ========================================

/**
 * Parse and validate a Flow.Json (root) configuration.
 *
 * @param data - Raw JSON data from config file
 * @returns Validated Flow.Json object
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
export function parseConfig(data: unknown): z.infer<typeof JsonSchema> {
  return JsonSchema.parse(data);
}

/**
 * Safely parse a Flow.Json (root) configuration without throwing.
 *
 * @param data - Raw JSON data from config file
 * @returns Success result with data or error result with issues
 */
export function safeParseConfig(data: unknown) {
  return JsonSchema.safeParse(data);
}

/**
 * Parse and validate a single Flow definition.
 *
 * @param data - Raw JSON data for a single flow
 * @returns Validated Flow object
 * @throws ZodError if validation fails
 */
export function parseFlow(data: unknown): z.infer<typeof FlowSchema> {
  return FlowSchema.parse(data);
}

/**
 * Safely parse a single Flow definition without throwing.
 */
export function safeParseFlow(data: unknown) {
  return FlowSchema.safeParse(data);
}

// ========================================
// JSON Schema Generation (consumed by IDE / tooling)
// ========================================

/**
 * JSON Schema for Flow.Json (root walkeros.config.json).
 *
 * @remarks
 * Used for IDE validation and autocomplete.
 * Hosted at https://walkeros.io/schema/flow/v4.json
 */
export const configJsonSchema = z.toJSONSchema(JsonSchema, {
  target: 'draft-7',
});

/**
 * JSON Schema for a single Flow.
 */
export const flowJsonSchema = toJsonSchema(FlowSchema, 'Flow');

/**
 * JSON Schema for the per-flow Config block (Flow.Config).
 */
export const flowConfigJsonSchema = toJsonSchema(ConfigSchema, 'FlowConfig');

/**
 * JSON Schema for Flow.Source.
 */
export const sourceJsonSchema = toJsonSchema(SourceSchema, 'Source');

/**
 * JSON Schema for Flow.Destination.
 */
export const destinationJsonSchema = toJsonSchema(
  DestinationSchema,
  'Destination',
);

/**
 * JSON Schema for Flow.Transformer.
 */
export const transformerJsonSchema = toJsonSchema(
  TransformerSchema,
  'Transformer',
);

/**
 * JSON Schema for Flow.Store.
 */
export const storeJsonSchema = toJsonSchema(StoreSchema, 'Store');

/**
 * JSON Schema for a single Contract rule (Flow.ContractRule).
 */
export const contractRuleJsonSchema = toJsonSchema(
  ContractRuleSchema,
  'ContractRule',
);

/**
 * JSON Schema for the named Contract map (Flow.Contract).
 */
export const contractJsonSchema = toJsonSchema(ContractSchema, 'Contract');
