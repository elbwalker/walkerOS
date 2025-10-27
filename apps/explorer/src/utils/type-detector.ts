import type { NodeType } from '../hooks/useMappingNavigation';
import type { RJSFSchema } from '@rjsf/utils';
import type { DestinationSchemas } from '../components/organisms/mapping-box';

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

  // String/number primitives → check for enum before defaulting to valueType
  if (schema.type === 'string' || schema.type === 'number') {
    // Enum detection: schema has enum property with values
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
      return 'enum';
    }
    return 'valueType';
  }

  // Unknown/complex types → valueType (let user define)
  return 'valueType';
}

/**
 * Navigate JSON Schema path to find nested schema
 *
 * Walks through nested object properties following the path array.
 * Used to find schema for deeply nested settings (e.g., settings.ga4.include).
 *
 * @param path - Path array to navigate (e.g., ['product', 'view', 'settings', 'ga4', 'include'])
 * @param rootSchema - Root JSON Schema to navigate from
 * @returns Schema at path, or null if not found
 */
export function navigateJsonSchema(
  path: string[],
  rootSchema: RJSFSchema,
): RJSFSchema | null {
  let schema: RJSFSchema = rootSchema;

  // Skip first segments until we reach 'settings'
  // Path format: [entity, action, 'settings', ...nestedPath]
  const settingsIndex = path.indexOf('settings');
  if (settingsIndex === -1) {
    return null; // Not a settings path
  }

  // Navigate from settings onwards
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
 * Universal type detection with schema fallback
 *
 * Enhanced three-tier detection strategy:
 * 1. Schema enum detection (for primitive values with schema enums)
 * 2. Value introspection (if value exists and not enum)
 * 3. JSON Schema detection (if schemas provided and value undefined)
 * 4. Default valueType (final fallback)
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
  // Priority 1: Check schema type for primitives (even when value exists)
  if (schemas?.mapping && path.includes('settings')) {
    const schema = navigateJsonSchema(path, schemas.mapping);

    // Boolean type → always use boolean pane (for both true/false values and undefined)
    if (
      schema?.type === 'boolean' &&
      (typeof value === 'boolean' || value === undefined || value === null)
    ) {
      return 'boolean';
    }

    // Enum detection for string/number values
    if (schema?.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
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
  }

  // Priority 2: Value introspection (most reliable for complex types)
  if (value !== undefined && value !== null) {
    return detectFromValue(value);
  }

  // Priority 3: JSON Schema detection (for undefined settings)
  if (schemas?.mapping && path.includes('settings')) {
    const schema = navigateJsonSchema(path, schemas.mapping);
    if (schema) {
      return detectFromJsonSchema(schema);
    }
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
