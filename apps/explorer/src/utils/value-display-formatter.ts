/**
 * Value Display Formatter
 *
 * Utilities for formatting values and extracting configured properties
 * from ValueConfig objects for display in badges and UI elements.
 */

export interface PropertyBadge {
  prop: string; // Property name (empty string for simple values)
  value: string; // Formatted value for display
  isLong: boolean; // True if value length > 20 characters
}

/**
 * Format a value for display in a badge
 *
 * @param val - The value to format
 * @returns Formatted string representation
 */
export function formatValueForDisplay(val: unknown): string {
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    // For arrays, show the first item (useful for loop/set arrays)
    const firstItem = val[0];
    if (typeof firstItem === 'string') return `"${firstItem}"`;
    if (typeof firstItem === 'number' || typeof firstItem === 'boolean')
      return String(firstItem);
    // For complex first items, show count
    return `[${val.length}]`;
  }

  if (typeof val === 'object' && val !== null) {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    // For objects (like map), show the keys in curly braces
    return `{ ${keys.join(', ')} }`;
  }

  return '';
}

/**
 * Extract configured properties from a value for display
 *
 * Handles:
 * - Simple strings: Returns without prop label
 * - ValueConfig with only key: Returns without prop label
 * - Full ValueConfig: Returns all configured properties with labels
 *
 * @param value - The value to analyze (string or ValueConfig object)
 * @returns Array of property badges for display
 */
export function getConfiguredProperties(value: unknown): PropertyBadge[] {
  // Simple string value - return without prop label
  if (typeof value === 'string') {
    return [
      {
        prop: '', // Empty prop means no label, just show the value
        value: `"${value}"`,
        isLong: value.length > 20,
      },
    ];
  }

  if (!value || typeof value !== 'object') return [];

  const props: PropertyBadge[] = [];
  const obj = value as Record<string, unknown>;

  // Check if this is a ValueConfig with ONLY a key property
  // In this case, display it as a simple value without the "key:" label
  const objKeys = Object.keys(obj);
  if (
    objKeys.length === 1 &&
    'key' in obj &&
    obj.key &&
    typeof obj.key === 'string'
  ) {
    return [
      {
        prop: '', // No label, just show the key value
        value: `"${obj.key}"`,
        isLong: obj.key.length > 20,
      },
    ];
  }

  // Helper to add a property to the list
  const addProp = (prop: string, val: unknown) => {
    const formatted = formatValueForDisplay(val);
    props.push({
      prop,
      value: formatted,
      isLong: formatted.length > 20,
    });
  };

  // Check all possible ValueConfig properties in consistent order
  if ('fn' in obj && obj.fn) addProp('fn', obj.fn);
  if ('key' in obj && obj.key) addProp('key', obj.key);
  if ('value' in obj && obj.value !== undefined) addProp('value', obj.value);
  if ('map' in obj && obj.map) addProp('map', obj.map);
  if ('loop' in obj && obj.loop) addProp('loop', obj.loop);
  if ('set' in obj && obj.set) addProp('set', obj.set);
  if ('consent' in obj && obj.consent) addProp('consent', obj.consent);
  if ('condition' in obj && obj.condition) addProp('condition', obj.condition);
  if ('validate' in obj && obj.validate) addProp('validate', obj.validate);

  return props;
}
