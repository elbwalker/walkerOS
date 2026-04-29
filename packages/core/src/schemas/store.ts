import { z, toJsonSchema } from './validation';
import { Identifier } from './primitives';
import { LoggerConfigSchema } from './logger';

/**
 * Store Schemas
 *
 * Mirrors: types/store.ts
 * Purpose: Runtime validation and JSON Schema generation for store configurations
 *
 * Stores are the 4th component type — passive key-value infrastructure that
 * other components consume via `env`. They are referenced via `$store.storeId`
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
      .unknown()
      .meta({
        id: 'StoreSettings',
        title: 'Store.Settings',
        description:
          'Implementation-specific configuration (store-defined shape).',
      })
      .describe('Implementation-specific configuration')
      .optional(),
    env: z
      .unknown()
      .meta({
        id: 'StoreEnv',
        title: 'Store.Env',
        description: 'Environment dependencies (store-defined shape).',
      })
      .describe('Environment dependencies (platform-specific)')
      .optional(),
    id: Identifier.describe(
      'Store instance identifier (defaults to store key)',
    ).optional(),
    logger: LoggerConfigSchema.optional().describe(
      'Logger configuration (level, handler) to override the collector defaults',
    ),
  })
  .meta({
    id: 'StoreConfig',
    title: 'Store.Config',
    description:
      'Store configuration (settings, env, logger) — key-value infrastructure component.',
  })
  .describe('Store configuration');

/**
 * PartialConfig - Config with all fields optional
 */
export const PartialConfigSchema = ConfigSchema.partial()
  .meta({
    id: 'StorePartialConfig',
    title: 'Store.PartialConfig',
    description: 'Partial store configuration with all fields optional.',
  })
  .describe('Partial store configuration with all fields optional');

// ========================================
// JSON Schema Exports (for Explorer/RJSF/MCP)
// ========================================

export const configJsonSchema = toJsonSchema(ConfigSchema, 'StoreConfig');

export const partialConfigJsonSchema = toJsonSchema(
  PartialConfigSchema,
  'PartialStoreConfig',
);
