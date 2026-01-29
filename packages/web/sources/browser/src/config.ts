import type { InitSettings, Settings } from './types';

/**
 * Get browser source configuration with defaults
 * @param initSettings - Initial settings to override defaults
 * @param envDocument - Document from environment (optional)
 * @returns Complete settings object with all defaults applied
 */
export function getConfig(
  initSettings: InitSettings = {},
  envDocument?: Document,
): Settings {
  return {
    prefix: 'data-elb',
    pageview: true,
    elb: 'elb',
    elbLayer: 'elbLayer',
    scope: envDocument || undefined,
    ...initSettings,
  };
}
