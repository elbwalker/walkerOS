import type { Source, Collector } from '@walkeros/core';
import { sourceBrowser } from '../index';
import type { Settings, BrowserSourceConfig } from '../types';

/**
 * Test helper to create browser sources for testing
 * Returns the source instance with elb function for test compatibility
 */
export async function createBrowserSource(
  collector: Collector.Instance,
  settings: Partial<Settings> = {},
): Promise<Source.Instance<BrowserSourceConfig> & { elb: Function }> {
  const config: Partial<BrowserSourceConfig> = {
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: false, // Disabled by default in tests to avoid extra walker on calls
      session: false, // Disabled by default in tests to avoid extra events
      elb: 'elb',
      elbLayer: 'elbLayer',
      ...settings,
    },
  };

  // Use Source.Environment with collector's elb function
  const env: Source.Environment = {
    elb: collector.push,
  };

  // Call sourceBrowser directly with new pattern
  const source = await sourceBrowser(config, env);

  // Get the elb function from window (set by the browser source)
  const elbName = config.settings?.elb || 'elb';
  const windowObj = window as typeof window & Record<string, unknown>;
  const elb = (windowObj[elbName] as Function) || collector.push;

  // Return source with elb for test compatibility
  return { ...source, elb };
}
