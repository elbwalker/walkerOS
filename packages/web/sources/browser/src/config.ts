import type { Settings } from './types';

/**
 * Get browser source configuration with defaults
 * @param settings - Partial settings to override defaults
 * @returns Complete settings object with all defaults applied
 */
export function getConfig(
  settings: Partial<Settings> = {},
): Required<Settings> {
  return {
    prefix: 'data-elb',
    pageview: true,
    session: true,
    elb: 'elb',
    elbLayer: 'elbLayer',
    scope: document,
    ...settings,
  };
}
