import { z, toJsonSchema } from './validation';
import { Identifier } from './primitives';
import { RoutableNextSchema } from './matcher';
import { CacheSchema } from './cache';
import { LoggerConfigSchema } from './logger';

/**
 * Transformer Schemas
 *
 * Mirrors: types/transformer.ts
 * Purpose: Runtime validation and JSON Schema generation for transformer configurations
 *
 * Transformers run between source and collector (pre-chain via `source.next`) or
 * between collector and destination (post-chain via `destination.before`), and
 * after destination push (`destination.next`). They validate, enrich, or redact
 * events in flight.
 */

// ========================================
// Configuration Schemas
// ========================================

/**
 * Config - Transformer configuration
 *
 * Mirrors types/transformer.ts Config interface. Shared fields wrap the
 * package-specific `settings` field.
 */
export const ConfigSchema = z
  .object({
    settings: z
      .any()
      .meta({
        id: 'TransformerSettings',
        title: 'Transformer.Settings',
        description:
          'Implementation-specific configuration (transformer-defined shape).',
      })
      .describe('Implementation-specific configuration')
      .optional(),
    env: z
      .any()
      .meta({
        id: 'TransformerEnv',
        title: 'Transformer.Env',
        description: 'Environment dependencies (transformer-defined shape).',
      })
      .describe('Environment dependencies (platform-specific)')
      .optional(),
    id: Identifier.describe(
      'Transformer instance identifier (defaults to transformer key)',
    ).optional(),
    logger: LoggerConfigSchema.optional().describe(
      'Logger configuration (level, handler) to override the collector defaults',
    ),
    before: RoutableNextSchema.optional().describe(
      'Pre-transformer chain that runs before this transformer pushes',
    ),
    next: RoutableNextSchema.optional().describe(
      'Graph wiring to the next transformer in the chain',
    ),
    cache: CacheSchema.optional().describe(
      'Step-level cache configuration for this transformer',
    ),
    init: z.boolean().describe('Whether to initialize immediately').optional(),
    disabled: z
      .boolean()
      .describe('Completely skip this transformer in chains')
      .optional(),
    mock: z
      .unknown()
      .meta({
        id: 'TransformerMock',
        title: 'Transformer.Mock',
        description:
          'Return this value instead of calling push(). Dev/testing only.',
      })
      .optional()
      .describe(
        'Return this value instead of calling push(). Global mock for all chains. Dev/testing only.',
      ),
    chainMocks: z
      .record(
        z.string(),
        z.unknown().meta({
          id: 'TransformerChainMock',
          title: 'Transformer.ChainMock',
          description: 'Chain-path-specific mock value. Dev/testing only.',
        }),
      )
      .optional()
      .describe(
        'Path-specific mock values keyed by chain path. Takes precedence over global mock. Dev/testing only.',
      ),
  })
  .meta({
    id: 'TransformerConfig',
    title: 'Transformer.Config',
    description:
      'Transformer configuration (settings, env, chain wiring, cache, mocks).',
  })
  .describe('Transformer configuration');

/**
 * PartialConfig - Config with all fields optional
 */
export const PartialConfigSchema = ConfigSchema.partial()
  .meta({
    id: 'TransformerPartialConfig',
    title: 'Transformer.PartialConfig',
    description: 'Partial transformer configuration with all fields optional.',
  })
  .describe('Partial transformer configuration with all fields optional');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const configJsonSchema = toJsonSchema(ConfigSchema, 'TransformerConfig');

export const partialConfigJsonSchema = toJsonSchema(
  PartialConfigSchema,
  'PartialTransformerConfig',
);
