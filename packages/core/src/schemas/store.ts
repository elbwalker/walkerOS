import { z, toJsonSchema } from './validation';
import { Identifier } from './primitives';

/**
 * Store Schemas
 *
 * Mirrors: types/store.ts
 * Purpose: Runtime validation and JSON Schema generation for store configurations
 *
 * Stores are the 4th component type — passive key-value infrastructure that
 * other components consume via `env`. They are referenced via `$store:storeId`
 * in `env` values. Init first, destroy last. No chains.
 */

// ========================================
// Configuration Schemas
// ========================================

/**
 * Config - Store configuration
 *
 * Mirrors types/store.ts Config interface. Minimal set of shared fields around
 * the package-specific `settings` field.
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
      'Store instance identifier (defaults to store key)',
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
  })
  .describe('Store configuration');

/**
 * PartialConfig - Config with all fields optional
 */
export const PartialConfigSchema = ConfigSchema.partial().describe(
  'Partial store configuration with all fields optional',
);

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const configJsonSchema = toJsonSchema(ConfigSchema, 'StoreConfig');

export const partialConfigJsonSchema = toJsonSchema(
  PartialConfigSchema,
  'PartialStoreConfig',
);
