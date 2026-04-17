import { z, toJsonSchema } from './validation';
import { Identifier } from './primitives';
import { RoutableNextSchema } from './matcher';
import { CacheSchema } from './cache';

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
      .describe('Implementation-specific configuration')
      .optional(),
    env: z
      .any()
      .describe('Environment dependencies (platform-specific)')
      .optional(),
    id: Identifier.describe(
      'Transformer instance identifier (defaults to transformer key)',
    ).optional(),
    logger: z
      .object({
        level: z
          .union([z.number(), z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG'])])
          .optional()
          .describe('Minimum log level (default: ERROR)'),
        handler: z.any().optional().describe('Custom log handler function'),
      })
      .optional()
      .describe(
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
      .optional()
      .describe(
        'Return this value instead of calling push(). Global mock for all chains. Dev/testing only.',
      ),
    chainMocks: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Path-specific mock values keyed by chain path. Takes precedence over global mock. Dev/testing only.',
      ),
  })
  .describe('Transformer configuration');

/**
 * PartialConfig - Config with all fields optional
 */
export const PartialConfigSchema = ConfigSchema.partial().describe(
  'Partial transformer configuration with all fields optional',
);

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const configJsonSchema = toJsonSchema(ConfigSchema, 'TransformerConfig');

export const partialConfigJsonSchema = toJsonSchema(
  PartialConfigSchema,
  'PartialTransformerConfig',
);
