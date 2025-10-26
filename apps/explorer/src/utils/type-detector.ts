import type { NodeType } from '../hooks/useMappingNavigation';

/**
 * Type Detector - Universal type detection for mapping values
 *
 * Detects the appropriate editor pane type by introspecting the actual value.
 * This replaces fragile path-based detection with reliable value-based detection.
 *
 * Core Principle: VALUE IS THE SOURCE OF TRUTH
 * - If a value exists, inspect its structure to determine the type
 * - No path patterns, no heuristics, just structural analysis
 *
 * @example
 * detectFromValue({ map: { currency: 'USD' } }) // → 'map'
 * detectFromValue(['nested', { map: {...} }]) // → 'loop'
 * detectFromValue(['value1', 'value2']) // → 'set'
 * detectFromValue('data.id') // → 'valueType'
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

  // Primitives → valueType
  if (typeof value === 'string') {
    return 'valueType';
  }
  if (typeof value === 'number') {
    return 'valueType';
  }
  if (typeof value === 'boolean') {
    return 'valueType';
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
