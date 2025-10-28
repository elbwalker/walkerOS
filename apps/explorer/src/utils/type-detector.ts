import type { NodeType } from '../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import type { DestinationSchemas } from '../components/organisms/mapping-box';
import type {
  ConfigStructureDef,
  PropertyDef,
} from '../schemas/config-structures/types';
import { destinationConfigStructureSchema } from '../schemas/destination-config-structure';

/**
 * Type Detector - Universal type detection for mapping values
 *
 * Detects the appropriate editor pane type using a three-tier detection strategy:
 * 1. Value introspection (most reliable - actual structure)
 * 2. JSON Schema detection (fallback - type hints for undefined values)
 * 3. Default valueType (final fallback - let user define)
 *
 * Core Principle: VALUE IS THE SOURCE OF TRUTH
 * - If a value exists, inspect its structure to determine the type
 * - If value is undefined, use JSON Schema as hint
 * - No path patterns, no fragile heuristics
 *
 * @example
 * // Priority 1: Value introspection
 * detectFromValue({ map: { currency: 'USD' } }) // → 'map'
 * detectFromValue(['nested', { map: {...} }]) // → 'loop'
 * detectFromValue(['value1', 'value2']) // → 'set'
 * detectFromValue('data.id') // → 'valueType'
 *
 * // Priority 2: JSON Schema detection
 * detectFromJsonSchema({ type: 'array', minItems: 2, maxItems: 2 }) // → 'loop'
 * detectFromJsonSchema({ type: 'object' }) // → 'map'
 */

/**
 * Detect NodeType from actual value structure
 *
 * Detection priority:
 * 1. Primitives → valueType
 * 2. Arrays → loop (heuristic) or set
 * 3. Objects with ValueConfig properties → specific type
 * 4. Plain objects → map
 *
 * @param value - The value to inspect
 * @returns The appropriate NodeType for editing this value
 */
export function detectFromValue(value: unknown): NodeType {
  // Null/undefined → valueType (let user define)
  if (value === undefined || value === null) {
    return 'valueType';
  }

  // Primitives
  if (typeof value === 'string') {
    return 'valueType';
  }
  if (typeof value === 'number') {
    return 'valueType';
  }
  if (typeof value === 'boolean') {
    return 'boolean'; // Boolean primitives use toggle pane
  }

  // Arrays → distinguish loop from set
  if (Array.isArray(value)) {
    return detectArrayType(value);
  }

  // Objects → detect ValueConfig or plain map
  if (typeof value === 'object') {
    return detectObjectType(value as Record<string, unknown>);
  }

  // Fallback
  return 'valueType';
}

/**
 * Detect array type: loop vs set
 *
 * Loop heuristic (walkerOS convention):
 * - Exactly 2 elements (tuple structure)
 * - First element is typically a source path (string or { key: "..." })
 * - Second element is typically a transformation (object)
 *
 * Examples:
 * - ['nested', { map: {...} }] → loop (2 elements, string + object)
 * - [{ key: 'data.items' }, { map: {...} }] → loop (2 elements, key object + object)
 * - ['value1', 'value2', 'value3'] → set (more than 2 elements)
 * - [{ a: 1 }, { b: 2 }] → set (2 elements but no key pattern)
 *
 * @param value - Array to analyze
 * @returns 'loop' or 'set'
 */
function detectArrayType(value: unknown[]): NodeType {
  // Empty array → set (user can add items)
  if (value.length === 0) {
    return 'set';
  }

  // Single element → set
  if (value.length === 1) {
    return 'set';
  }

  // Exactly 2 elements → check if it matches loop pattern
  if (value.length === 2) {
    const first = value[0];
    const second = value[1];

    // Loop pattern requires second element to be an object (transform)
    // This prevents false positives like ['data', 'context']
    if (typeof second !== 'object' || second === null) {
      return 'set';
    }

    // Loop pattern 1: ['sourceString', transformObject]
    if (typeof first === 'string') {
      return 'loop';
    }

    // Loop pattern 2: [{ key: 'path' }, transformObject]
    if (
      typeof first === 'object' &&
      first !== null &&
      'key' in first &&
      typeof (first as Record<string, unknown>).key === 'string'
    ) {
      return 'loop';
    }

    // Two elements but doesn't match loop pattern → set
    return 'set';
  }

  // More than 2 elements → set
  return 'set';
}

/**
 * Detect object type: ValueConfig property or plain map
 *
 * ValueConfig properties (from @walkeros/core/types/mapping.ts):
 * - fn: Function string
 * - key: Property path string
 * - value: Static primitive value
 * - map: Object with key-value mappings
 * - loop: Array with [source, transform] tuple
 * - set: Array of values
 * - consent: Consent requirement object
 * - condition: Condition function string
 * - validate: Validation function string
 *
 * Detection priority:
 * 1. Check for complex ValueConfig properties (fn, loop, map, set, condition, validate)
 * 2. Check if it's a valueType context (only key/value/consent properties)
 * 3. Default to map (generic object editor)
 *
 * @param obj - Object to analyze
 * @returns NodeType for this object
 */
function detectObjectType(obj: Record<string, unknown>): NodeType {
  // Complex ValueConfig properties → specific editors
  if ('fn' in obj) return 'fn';
  if ('loop' in obj) return 'loop';
  if ('map' in obj) return 'map';
  if ('set' in obj) return 'set';
  if ('condition' in obj) return 'condition';
  if ('validate' in obj) return 'validate';

  // Consent-only object → consent editor
  if ('consent' in obj && Object.keys(obj).length === 1) {
    return 'consent';
  }

  // ValueType context: object with only key/value/consent properties
  // These should open valueType pane which shows tiles for conversion
  const keys = Object.keys(obj);
  const isValueTypeContext = keys.every((k) =>
    ['key', 'value', 'consent'].includes(k),
  );

  if (isValueTypeContext && keys.length > 0 && keys.length <= 2) {
    return 'valueType';
  }

  // Generic object → map pane
  // Examples:
  // - { currency: 'USD', value: 99 } → map
  // - { ga4: {...}, ads: {...} } → map
  // - { item_id: 'data.id' } → map
  return 'map';
}

/**
 * Detect NodeType from JSON Schema
 *
 * Used as fallback when value is undefined. Reads type hints from JSON Schema
 * to determine the appropriate editor pane.
 *
 * This enables type detection for settings that haven't been defined yet,
 * using destination-provided schemas as guidance.
 *
 * JSON Schema → NodeType mappings:
 * - type: 'array' + minItems: 2 + maxItems: 2 → 'loop' (tuple pattern)
 * - type: 'array' → 'set' (generic array)
 * - type: 'object' → 'map' (object editor)
 * - type: 'string'/'number'/'boolean' → 'valueType' (simple value)
 *
 * @param schema - JSON Schema definition
 * @returns NodeType for this schema
 */
export function detectFromJsonSchema(schema: RJSFSchema): NodeType {
  // Array types - distinguish loop (tuple) from set
  if (schema.type === 'array') {
    // Loop pattern: tuple with exactly 2 items
    // Zod's z.tuple([a, b]) converts to: { type: 'array', minItems: 2, maxItems: 2 }
    if (schema.minItems === 2 && schema.maxItems === 2) {
      return 'loop';
    }
    // Generic array → set
    return 'set';
  }

  // Object type → map editor
  if (schema.type === 'object') {
    return 'map';
  }

  // Boolean type → boolean pane with toggle
  if (schema.type === 'boolean') {
    return 'boolean';
  }

  // String/number primitives → check for enum, then use primitive pane
  if (schema.type === 'string' || schema.type === 'number') {
    // Enum detection: schema has enum property with values
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
      return 'enum';
    }
    // Schema-defined primitives use the primitive pane (no ValueConfig conversion tiles)
    return 'primitive';
  }

  // Unknown/complex types → valueType (let user define)
  return 'valueType';
}

/**
 * Navigate JSON Schema path for config-level settings
 *
 * Handles paths like: ['settings', 'pixelId'] or ['settings', 'ga4', 'measurementId']
 * Uses the config-level settings schema (schemas.settings)
 *
 * @param path - Path array starting with 'settings'
 * @param settingsSchema - Config-level settings schema
 * @returns Schema at path, or null if not found
 */
export function navigateSettingsSchema(
  path: string[],
  settingsSchema: RJSFSchema,
): RJSFSchema | null {
  // Path should start with 'settings'
  if (path.length === 0 || path[0] !== 'settings') {
    return null;
  }

  // Start from settings schema
  let schema: RJSFSchema = settingsSchema;

  // Navigate from second element onwards (skip 'settings' itself)
  for (let i = 1; i < path.length; i++) {
    const key = path[i];

    // Check if current schema has properties
    if (!schema.properties || !(key in schema.properties)) {
      return null; // Path doesn't exist in schema
    }

    // Navigate to nested property
    schema = schema.properties[key] as RJSFSchema;
  }

  return schema;
}

/**
 * Navigate JSON Schema path for rule-level mapping settings
 *
 * Handles paths like: ['mapping', 'product', 'view', 'settings', 'track']
 * Uses the rule-level mapping schema (schemas.mapping)
 *
 * @param path - Path array with 'settings' somewhere after mapping/entity/action
 * @param mappingSchema - Rule-level mapping settings schema
 * @returns Schema at path, or null if not found
 */
export function navigateMappingSettingsSchema(
  path: string[],
  mappingSchema: RJSFSchema,
): RJSFSchema | null {
  let schema: RJSFSchema = mappingSchema;

  // Find where 'settings' appears in the path
  const settingsIndex = path.indexOf('settings');
  if (settingsIndex === -1) {
    return null; // Not a settings path
  }

  // Navigate from settings onwards (skip entity/action parts)
  for (let i = settingsIndex + 1; i < path.length; i++) {
    const key = path[i];

    // Check if current schema has properties
    if (!schema.properties || !(key in schema.properties)) {
      return null; // Path doesn't exist in schema
    }

    // Navigate to nested property
    schema = schema.properties[key] as RJSFSchema;
  }

  return schema;
}

/**
 * @deprecated Use navigateMappingSettingsSchema instead
 * Legacy alias for backward compatibility
 */
export const navigateJsonSchema = navigateMappingSettingsSchema;

/**
 * Universal type detection with schema fallback
 *
 * SCHEMA-FIRST detection strategy:
 * 1. Determine correct schema based on path structure
 * 2. Schema enum/boolean detection (for primitive values with schema hints)
 * 3. Value introspection (if value exists and not primitive)
 * 4. JSON Schema detection (for undefined values)
 * 5. Default valueType (final fallback)
 *
 * Path-to-Schema Routing:
 * - ['settings', ...] → schemas.settings (config-level)
 * - ['mapping', entity, action, 'settings', ...] → schemas.mapping (rule-level)
 * - ['data'] → schemas.data
 * - ['id'], ['loadScript'], etc. → destinationConfigStructureSchema
 *
 * @param value - The value to inspect
 * @param path - Path to the value (for schema navigation)
 * @param schemas - Optional destination schemas
 * @returns NodeType for editing this value
 */
export function detectNodeType(
  value: unknown,
  path: string[],
  schemas?: DestinationSchemas,
): NodeType {
  let schema: RJSFSchema | null = null;

  // SCHEMA-FIRST: Determine which schema to use based on path structure
  if (path.length === 1 && destinationConfigStructureSchema.properties) {
    // Root-level config properties (id, loadScript, queue, verbose, consent, policy, etc.)
    const propSchema = destinationConfigStructureSchema.properties[path[0]];
    schema = propSchema as RJSFSchema | null;
  } else if (path.length >= 2 && path[0] === 'settings' && schemas?.settings) {
    // Config-level settings: ['settings', 'pixelId'] or ['settings', 'ga4', 'measurementId']
    schema = navigateSettingsSchema(path, schemas.settings);
  } else if (path.includes('settings') && schemas?.mapping) {
    // Rule-level mapping settings: ['mapping', 'product', 'view', 'settings', 'track']
    schema = navigateMappingSettingsSchema(path, schemas.mapping);
  } else if (path.length >= 2 && path[0] === 'data' && schemas?.data) {
    // Data transformations - schemas.data describes expected event data properties
    // Note: This is for DATA PROPERTIES not ValueConfig transformations
    // ValueConfig (map/loop/fn) is detected via value introspection
    schema = schemas.data;
  }

  // Priority 1: Schema type detection for primitives (ALWAYS check schema first for primitives)
  if (schema) {
    // Boolean type → always use boolean pane
    if (
      schema.type === 'boolean' &&
      (typeof value === 'boolean' || value === undefined || value === null)
    ) {
      return 'boolean';
    }

    // Enum detection for string/number values
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
      // Value is primitive and schema defines enum → use enum pane
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        value === undefined ||
        value === null
      ) {
        return 'enum';
      }
    }

    // String/Number primitives with schema → use schema-driven editor
    // This ensures string fields like 'pixelId' use proper string input, not valueType tiles
    if (
      (schema.type === 'string' || schema.type === 'number') &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        value === undefined ||
        value === null)
    ) {
      return detectFromJsonSchema(schema);
    }
  }

  // Priority 2: Value introspection (for complex types like map, loop, fn, etc.)
  if (value !== undefined && value !== null) {
    const detectedType = detectFromValue(value);
    // If value is a primitive but we have a schema, prefer schema detection
    // This prevents string values from showing valueType tiles when schema exists
    if (
      schema &&
      (detectedType === 'valueType' || detectedType === 'boolean')
    ) {
      return detectFromJsonSchema(schema);
    }
    return detectedType;
  }

  // Priority 3: JSON Schema detection (for undefined values or when value detection unclear)
  if (schema) {
    return detectFromJsonSchema(schema);
  }

  // Priority 4: Default fallback
  return 'valueType';
}

/**
 * Get value at path from mapping config
 *
 * Helper function to safely navigate nested mapping structure.
 *
 * @param config - Full mapping config
 * @param path - Path array to navigate
 * @returns Value at path or undefined
 */
export function getValueAtPath(
  config: Record<string, unknown>,
  path: string[],
): unknown {
  let current: unknown = config;

  for (const segment of path) {
    if (
      typeof current !== 'object' ||
      current === null ||
      !(segment in current)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Structure-aware type detection (for generic ConfigEditor)
 *
 * Enhanced detection that uses ConfigStructureDef to determine NodeTypes.
 * This allows the same editor to work at any depth with any config type.
 *
 * Detection Strategy:
 * 1. Check structure definition for explicit nodeType
 * 2. Handle special patterns (entity-action)
 * 3. Fall back to schema-driven detection
 * 4. Fall back to value introspection
 *
 * @param value - The value to inspect
 * @param path - Path to the value
 * @param structure - Structure definition for the config
 * @param schemas - Optional JSON schemas bundle
 * @returns Appropriate NodeType for editing
 *
 * @example
 * // With structure definition
 * const nodeType = detectNodeTypeWithStructure(
 *   value,
 *   ['settings', 'pixelId'],
 *   DESTINATION_CONFIG_STRUCTURE,
 *   { settings: pixelIdSchema }
 * );
 */
export function detectNodeTypeWithStructure(
  value: unknown,
  path: string[],
  structure: ConfigStructureDef,
  schemas?: Record<string, RJSFSchema>,
): NodeType {
  // Empty path → use structure root type
  if (path.length === 0) {
    return structure.rootNodeType || 'entity';
  }

  // Navigate structure definition to find property
  let currentStructure = structure;
  let propertyDef: PropertyDef | undefined;

  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    propertyDef = currentStructure.properties?.[segment];

    if (!propertyDef) break;

    // If property has nested structure, continue navigating
    if (propertyDef.structure) {
      currentStructure = propertyDef.structure;
    }
  }

  // Priority 1: Explicit nodeType in structure definition
  if (propertyDef?.nodeType) {
    return propertyDef.nodeType;
  }

  // Priority 2: Handle entity-action pattern
  if (propertyDef?.children === 'entity-action') {
    // Determine depth in entity-action hierarchy
    const baseDepth = path.length - 1; // Depth of mapping property itself
    const relativeDepth = path.length - baseDepth;

    if (relativeDepth === 1) return 'entity'; // mapping.{entity}
    if (relativeDepth === 2) return 'rule'; // mapping.{entity}.{action}

    // Deeper than rule level: check for rule properties using MAPPING_RULE_STRUCTURE
    if (relativeDepth >= 3) {
      // Import MAPPING_RULE_STRUCTURE inline to avoid circular deps
      // Path segment after the rule: e.g., 'settings', 'name', 'batch'
      const rulePropertySegmentIndex = baseDepth + 2; // Index of first property after entity.action
      const rulePropertyPath = path.slice(rulePropertySegmentIndex);

      // Try to navigate MAPPING_RULE_STRUCTURE for rule properties
      // This handles: name, batch, settings, data, consent, condition, ignore, policy
      if (rulePropertyPath.length > 0) {
        // Use the same MAPPING_RULE_STRUCTURE that tree building uses
        // We can't import it here to avoid circular deps, so we'll fall through to schema detection
        // The schema-driven detection below will handle it
      }
    }
  }

  // Priority 3: Schema-driven detection
  const schema = getSchemaForPathFromBundle(path, propertyDef, schemas);
  if (schema) {
    // Check schema type for primitives
    if (
      schema.type === 'boolean' &&
      (typeof value === 'boolean' || value === undefined || value === null)
    ) {
      return 'boolean';
    }

    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        value === undefined ||
        value === null
      ) {
        return 'enum';
      }
    }

    if (
      (schema.type === 'string' || schema.type === 'number') &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        value === undefined ||
        value === null)
    ) {
      return detectFromJsonSchema(schema);
    }
  }

  // Priority 4: Value introspection
  if (value !== undefined && value !== null) {
    const detectedType = detectFromValue(value);
    if (
      schema &&
      (detectedType === 'valueType' || detectedType === 'boolean')
    ) {
      return detectFromJsonSchema(schema);
    }
    return detectedType;
  }

  // Priority 5: JSON Schema fallback
  if (schema) {
    return detectFromJsonSchema(schema);
  }

  // Priority 6: Default
  return 'valueType';
}

/**
 * Get schema for a path from schemas bundle
 *
 * Helper for structure-aware detection.
 *
 * @param path - Path array
 * @param propertyDef - Property definition with schemaPath
 * @param schemas - Schemas bundle
 * @returns JSON Schema or undefined
 */
function getSchemaForPathFromBundle(
  path: string[],
  propertyDef: PropertyDef | undefined,
  schemas?: Record<string, RJSFSchema>,
): RJSFSchema | undefined {
  if (!schemas) return undefined;

  // If no propertyDef, try generic path-based schema navigation
  if (!propertyDef) {
    // Config-level settings: ['settings', 'pixelId']
    if (path.length >= 2 && path[0] === 'settings' && schemas.settings) {
      return navigateSettingsSchema(path, schemas.settings) || undefined;
    }

    // Rule-level mapping settings: ['mapping', 'product', 'view', 'settings', 'track']
    if (path.includes('settings') && schemas.mapping) {
      return navigateMappingSettingsSchema(path, schemas.mapping) || undefined;
    }

    return undefined;
  }

  const schemaPath = propertyDef.schemaPath;
  if (!schemaPath) return undefined;

  // Get schema from bundle
  const schema = schemas[schemaPath];
  if (!schema) return undefined;

  // Navigate nested schema if this is a schema-driven property with children
  if (propertyDef.children === 'schema-driven' && path.length >= 2) {
    // The propertyDef is for the parent (e.g., 'settings')
    // We need to navigate to the child property (e.g., 'track')
    // Use the existing navigation utilities
    if (path.includes('settings') && schemaPath === 'mapping') {
      // Rule-level settings path
      return navigateMappingSettingsSchema(path, schema) || undefined;
    } else if (path[0] === 'settings' && schemaPath === 'settings') {
      // Config-level settings path
      return navigateSettingsSchema(path, schema) || undefined;
    }
  }

  return schema;
}
