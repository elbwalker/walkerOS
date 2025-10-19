/**
 * Clean form data by removing undefined, empty values, and invalid structures
 *
 * This utility ensures that RJSF auto-initialized empty values don't pollute
 * the mapping configuration. It handles:
 * - undefined values
 * - empty strings (except for 'value' field which allows '')
 * - empty arrays (set: [], etc.)
 * - empty objects (map: {}, consent: {}, etc.)
 * - invalid loop tuples ([null, {}], ['', {}], etc.)
 *
 * Used at multiple levels:
 * - Mapping rule level (mapping-editor.tsx)
 * - ValueConfig level (mapping-data.tsx)
 * - Nested ValueConfig levels (mapping-map-entry.tsx, mapping-set-entry.tsx)
 */
export function cleanFormData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Skip empty strings (except 'value' field which allows empty string as valid)
    if (value === '' && key !== 'value') continue;

    // Skip empty arrays (set: [], or any other empty array)
    if (Array.isArray(value) && value.length === 0) continue;

    // Skip invalid loop arrays: [null, {}], ['', {}], or any loop without valid source and transform
    if (key === 'loop' && Array.isArray(value) && value.length === 2) {
      const source = value[0];
      const transform = value[1];

      const hasValidSource =
        typeof source === 'string' && source.trim().length > 0;
      const hasValidTransform =
        transform &&
        typeof transform === 'object' &&
        !Array.isArray(transform) &&
        Object.keys(transform).length > 0;

      // Only keep loop if both source and transform are valid
      if (!hasValidSource || !hasValidTransform) {
        continue;
      }
    }

    // Skip empty objects (map: {}, consent: {}, or any other empty object)
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }

    // Keep all other values
    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * Clean mapping rule data (top-level mapping rules)
 *
 * Extends cleanFormData with additional mapping-specific rules:
 * - Skip false boolean values for 'ignore' field
 * - Skip zero or undefined for 'batch' field
 */
export function cleanMappingRuleData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned = cleanFormData(data);
  const ruleCleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(cleaned)) {
    // Skip false boolean values for ignore field
    if (key === 'ignore' && value === false) continue;

    // Skip zero or undefined for batch
    if (key === 'batch' && (!value || value === 0)) continue;

    ruleCleaned[key] = value;
  }

  return ruleCleaned;
}
