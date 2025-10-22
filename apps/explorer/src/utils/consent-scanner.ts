import type { Mapping } from '@walkeros/core';

/**
 * Scan entire mapping configuration for all consent state names
 *
 * Recursively traverses the mapping rules and collects unique consent state names
 * from:
 * - Top-level consent (destination-wide)
 * - Rule-level consent (rule.consent)
 * - ValueConfig-level consent (data.map.*.consent, nested structures)
 *
 * @param config - The mapping configuration to scan
 * @returns Array of unique consent state names sorted alphabetically
 *
 * @example
 * const states = scanMappingForConsentStates(config);
 * // ['analytics', 'functional', 'marketing']
 */
export function scanMappingForConsentStates(
  config: Mapping.Config | Mapping.Rules,
): string[] {
  const consentStates = new Set<string>();

  /**
   * Recursively scan any value for consent objects
   * Handles Value, ValueType, ValueConfig, and all nested structures
   */
  function scanValue(value: unknown): void {
    // Handle null/undefined
    if (!value) return;

    // Handle arrays (Value can be Array<ValueType>)
    if (Array.isArray(value)) {
      value.forEach((item) => scanValue(item));
      return;
    }

    // Handle primitives (strings)
    if (typeof value !== 'object') return;

    // If this value has a consent property, collect its keys
    if ('consent' in value) {
      const consent = (value as Record<string, unknown>).consent;
      if (consent && typeof consent === 'object') {
        Object.keys(consent).forEach((state) => consentStates.add(state));
      }
    }

    // Recursively scan ValueConfig properties
    if ('map' in value) {
      const map = (value as Record<string, unknown>).map;
      if (map && typeof map === 'object') {
        Object.values(map).forEach((nestedValue) => scanValue(nestedValue));
      }
    }

    if ('loop' in value) {
      const loop = (value as Record<string, unknown>).loop;
      if (Array.isArray(loop)) {
        loop.forEach((item) => scanValue(item));
      }
    }

    if ('set' in value) {
      const set = (value as Record<string, unknown>).set;
      if (Array.isArray(set)) {
        set.forEach((item) => scanValue(item));
      }
    }

    // Scan rule properties that contain Data/Value types
    if ('data' in value) {
      const data = (value as Record<string, unknown>).data;
      scanValue(data);
    }

    // Scan other nested objects generically
    for (const key in value) {
      if (
        key !== 'consent' &&
        key !== 'map' &&
        key !== 'loop' &&
        key !== 'set' &&
        key !== 'data'
      ) {
        const nestedValue = (value as Record<string, unknown>)[key];
        if (nestedValue && typeof nestedValue === 'object') {
          scanValue(nestedValue);
        }
      }
    }
  }

  // Check if this is a full Config or just Rules
  const isFullConfig =
    'mapping' in config ||
    'consent' in config ||
    'data' in config ||
    'policy' in config;

  // Scan top-level consent (destination-wide) - only in full Config
  if (isFullConfig && 'consent' in config && config.consent) {
    Object.keys(config.consent).forEach((state) => consentStates.add(state));
  }

  // Determine where the rules are
  const rules: Mapping.Rules =
    isFullConfig && 'mapping' in config
      ? config.mapping || {}
      : (config as Mapping.Rules);

  // Scan rules recursively
  Object.values(rules).forEach((entityRules) => {
    if (!entityRules) return;

    Object.values(entityRules).forEach((ruleOrArray) => {
      if (!ruleOrArray) return;

      // Handle both single rule and array of rules
      const ruleArray = Array.isArray(ruleOrArray)
        ? ruleOrArray
        : [ruleOrArray];

      ruleArray.forEach((rule) => {
        if (rule && typeof rule === 'object') {
          // Scan the entire rule recursively (includes rule.consent and all nested ValueConfigs)
          scanValue(rule);
        }
      });
    });
  });

  // Return sorted array
  return Array.from(consentStates).sort();
}
