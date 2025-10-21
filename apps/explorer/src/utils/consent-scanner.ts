import type { Mapping } from '@walkeros/core';

/**
 * Scan entire mapping configuration for all consent state names
 *
 * Traverses the mapping rules and collects unique consent state names
 * from rule.consent objects across all entities and actions.
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

  // Scan rule-level consent
  Object.values(rules).forEach((entityRules) => {
    if (!entityRules) return;

    Object.values(entityRules).forEach((ruleOrArray) => {
      if (!ruleOrArray) return;

      // Handle both single rule and array of rules
      const ruleArray = Array.isArray(ruleOrArray)
        ? ruleOrArray
        : [ruleOrArray];

      ruleArray.forEach((rule) => {
        if (rule && typeof rule === 'object' && 'consent' in rule) {
          const consent = rule.consent;
          if (consent && typeof consent === 'object') {
            Object.keys(consent).forEach((state) => consentStates.add(state));
          }
        }
      });
    });
  });

  // Return sorted array
  return Array.from(consentStates).sort();
}
