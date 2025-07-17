import type { Settings } from './types';

/**
 * Get browser source configuration with defaults
 * @param settings - Partial settings to override defaults
 * @returns Complete settings object with all defaults applied
 */
export function getConfig(
  settings: Partial<Settings> = {},
): Required<Settings> {
  // Ensure scope is valid, default to document if null/undefined
  const validScope = settings.scope || document;

  return {
    prefix: 'data-elb',
    pageview: true,
    session: true,
    elb: 'elb',
    name: 'walkerjs',
    elbLayer: 'elbLayer',
    ...settings,
    scope: validScope, // Override to ensure valid scope
  };
}
