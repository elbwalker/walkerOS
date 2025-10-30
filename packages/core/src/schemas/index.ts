/**
 * walkerOS Core Schemas
 *
 * Zod schemas for runtime validation and JSON Schema generation.
 * These schemas mirror TypeScript types in packages/core/src/types/
 * and are used for:
 * - Runtime validation at system boundaries (MCP tools, APIs, CLI)
 * - JSON Schema generation for Explorer UI (RJSF)
 * - Documentation and type metadata
 *
 * Note: TypeScript types remain the source of truth for development.
 * Schemas are for runtime validation and tooling support.
 *
 * Organization: Schema files mirror type files
 * - types/walkeros.ts → schemas/walkeros.ts
 * - types/mapping.ts → schemas/mapping.ts
 * - types/destination.ts → schemas/destination.ts
 * - types/collector.ts → schemas/collector.ts
 * - types/source.ts → schemas/source.ts
 * - types/storage.ts + types/handler.ts → schemas/utilities.ts
 *
 * Import strategy:
 * Due to overlapping schema names across domains (ConfigSchema, InstanceSchema, etc.),
 * schemas are organized into namespaces. Import either:
 * 1. From namespaces: import { WalkerOSSchemas, MappingSchemas } from '@walkeros/core/schemas'
 * 2. Direct from files: import { EventSchema } from '@walkeros/core/schemas/walkeros'
 */

// ========================================
// Namespace Exports (prevents name collisions)
// ========================================

import * as WalkerOSSchemas from './walkeros';
import * as MappingSchemas from './mapping';
import * as DestinationSchemas from './destination';
import * as CollectorSchemas from './collector';
import * as SourceSchemas from './source';
import * as UtilitySchemas from './utilities';

export {
  WalkerOSSchemas,
  MappingSchemas,
  DestinationSchemas,
  CollectorSchemas,
  SourceSchemas,
  UtilitySchemas,
};

// ========================================
// Direct Exports (commonly used schemas)
// ========================================

// Export commonly used schemas from WalkerOS namespace directly
export {
  EventSchema,
  PartialEventSchema,
  DeepPartialEventSchema,
  PropertiesSchema,
  OrderedPropertiesSchema,
  UserSchema,
  EntitySchema,
  EntitiesSchema,
  ConsentSchema,
  SourceTypeSchema,
  VersionSchema,
  SourceSchema,
  PropertySchema,
  PropertyTypeSchema,
  // JSON Schemas
  eventJsonSchema,
  partialEventJsonSchema,
  userJsonSchema,
  propertiesJsonSchema,
  orderedPropertiesJsonSchema,
  entityJsonSchema,
  sourceTypeJsonSchema,
  consentJsonSchema,
} from './walkeros';

// Export commonly used schemas from Mapping namespace directly
export {
  ValueSchema,
  ValuesSchema,
  ValueConfigSchema,
  LoopSchema,
  SetSchema,
  MapSchema,
  PolicySchema,
  RuleSchema,
  RulesSchema,
  ResultSchema as MappingResultSchema, // Alias to avoid conflict with Destination.ResultSchema
  // JSON Schemas
  valueJsonSchema,
  valueConfigJsonSchema,
  loopJsonSchema,
  setJsonSchema,
  mapJsonSchema,
  policyJsonSchema,
  ruleJsonSchema,
  rulesJsonSchema,
} from './mapping';

// ========================================
// Schema Builder - DRY utility for destinations
// ========================================

/**
 * Schema Builder - DRY utility for destinations
 *
 * Destinations can use these utilities to create JSON Schemas WITHOUT
 * needing Zod as a dependency. The core package handles all schema logic.
 *
 * This follows the DRY principle - write once in core, use everywhere.
 */
export * from './schema-builder';

// ========================================
// Deprecated: value-config.ts
// ========================================

/**
 * @deprecated Import from MappingSchemas or directly from './mapping' instead
 *
 * The value-config.ts file has been migrated to mapping.ts for better organization.
 * This export is kept for backward compatibility but will be removed in a future version.
 *
 * Migration:
 * - Old: import { ValueSchema, ValueConfigSchema } from '@walkeros/core'
 * - New: import { ValueSchema, ValueConfigSchema } from '@walkeros/core'
 *        (imports now come from mapping.ts but the API is identical)
 *
 * Breaking change: The value-config.ts file will be removed in the next major version.
 * All schemas are now organized by domain (mapping, destination, collector, etc.)
 */
// Note: Schemas are already exported above from mapping.ts
