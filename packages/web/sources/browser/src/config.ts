import type { InitSettings, Settings } from './types';

/**
 * Get browser source configuration with defaults
 * @param initSettings - Initial settings to override defaults
 * @returns Complete settings object with all defaults applied
 */
export function getConfig(initSettings: InitSettings = {}): Settings {
  return {
    prefix: 'data-elb',
    pageview: true,
    session: true,
    elb: 'elb',
    elbLayer: 'elbLayer',
    scope: document,
    ...initSettings,
  };
}
