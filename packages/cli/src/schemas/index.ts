/**
 * CLI Schema Definitions
 *
 * Zod schemas for runtime validation of CLI configurations.
 */

export * as BundleSchemas from './bundle';

// Export commonly used schemas directly
export {
  BuildOptionsSchema,
  MinifyOptionsSchema,
  ConfigSchema as BundleConfigSchema,
  SetupSchema as BundleSetupSchema,
  parseConfig,
  safeParseConfig,
  parseSetup,
  safeParseSetup,
} from './bundle';
