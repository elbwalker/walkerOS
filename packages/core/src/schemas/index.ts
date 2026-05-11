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
 * - types/flow.ts → schemas/flow.ts
 * - types/storage.ts + types/handler.ts → schemas/utilities.ts
 *
 * Import strategy:
 * Due to overlapping schema names across domains (ConfigSchema, InstanceSchema, etc.),
 * schemas are organized into namespaces. Import either:
 * 1. From namespaces: import { WalkerOSSchemas, MappingSchemas } from '@walkeros/core/dev'
 * 2. Direct from files: import { EventSchema } from '@walkeros/core/schemas/walkeros'
 */

// ========================================
// Primitives & Patterns (DRY building blocks)
// ========================================

export * from './primitives';
export * from './patterns';

// ========================================
// Namespace Exports (prevents name collisions)
// ========================================

import * as WalkerOSSchemas from './walkeros';
import * as MappingSchemas from './mapping';
import * as DestinationSchemas from './destination';
import * as CollectorSchemas from './collector';
import * as SourceSchemas from './source';
import * as TransformerSchemas from './transformer';
import * as StoreSchemas from './store';
import * as FlowSchemas from './flow';
import * as UtilitySchemas from './utilities';

export {
  WalkerOSSchemas,
  MappingSchemas,
  DestinationSchemas,
  CollectorSchemas,
  SourceSchemas,
  TransformerSchemas,
  StoreSchemas,
  FlowSchemas,
  UtilitySchemas,
};

// Cache schemas (used by flow schemas for caching)
import * as CacheSchemas from './cache';
export { CacheSchemas };
export { CacheSchema, CacheRuleSchema } from './cache';

// Matcher schemas (used by flow schemas for routing)
import * as MatcherSchemas from './matcher';
export { MatcherSchemas };
export {
  MatchExpressionSchema,
  RoutableNextSchema,
  NextRuleSchema,
} from './matcher';

// Hint schemas (direct export - flat record, no namespace needed)
export { CodeSchema, HintSchema, HintsSchema } from './hint';
export { ClickIdEntrySchema } from './marketing';

// Logger schemas (shared config used by destination/source/transformer/store/collector)
export { LoggerConfigSchema, LoggerHandlerSchema } from './logger';

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

// Export commonly used schemas from Flow namespace directly
export {
  JsonSchema as FlowJsonSchema,
  FlowSchema,
  ConfigSchema as FlowConfigSchema,
  ContractSchema,
  ContractActionsSchema,
  ContractSchemaEntry,
  ContractRuleSchema,
  SourceSchema as FlowSourceSchema,
  DestinationSchema as FlowDestinationSchema,
  StoreSchema as FlowStoreSchema,
  TransformerSchema as FlowTransformerSchema,
  CodeSchema as FlowCodeSchema,
  BundleSchema as FlowBundleSchema,
  BundlePackageSchema as FlowBundlePackageSchema,
  parseConfig,
  safeParseConfig,
  parseFlow,
  safeParseFlow,
  // JSON Schemas
  configJsonSchema,
  flowJsonSchema,
  flowConfigJsonSchema,
  sourceJsonSchema,
  destinationJsonSchema,
  storeJsonSchema,
  transformerJsonSchema,
  contractRuleJsonSchema,
  contractJsonSchema,
} from './flow';

// Validation
export type { ValidationIssue, ValidationResult } from './validate';
export type { IntelliSenseContext, PackageInfo } from './intellisense';
export { validateFlowConfig } from './validate-flow-config';

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

/**
 * Re-export Zod and zod-to-json-schema for destinations
 *
 * Destinations can import Zod from @walkeros/core instead of adding
 * their own dependency. This ensures version consistency and reduces
 * duplicate dependencies in the monorepo.
 *
 * Usage in destinations:
 * import { z, zodToSchema } from '@walkeros/core/dev';
 */
export { z } from './validation';

import type { zod } from './validation';
import { z } from './validation';

/**
 * JSONSchema type for JSON Schema Draft 7 objects
 *
 * Represents a JSON Schema object as returned by Zod's toJSONSchema().
 * Uses Record<string, unknown> as JSON Schema structure is dynamic.
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Utility to convert Zod schema to JSON Schema with consistent defaults
 *
 * This wrapper ensures all destinations use the same JSON Schema configuration:
 * - target: 'draft-7' (JSON Schema Draft 7 format)
 *
 * Usage in destinations:
 * import { zodToSchema } from '@walkeros/core/dev';
 * export const settings = zodToSchema(SettingsSchema);
 *
 * @param schema - Zod schema to convert
 * @returns JSON Schema Draft 7 object
 */
export function zodToSchema(schema: zod.ZodTypeAny): JSONSchema {
  return z.toJSONSchema(schema, {
    target: 'draft-7',
  }) as JSONSchema;
}
