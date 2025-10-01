import type { Source, Collector } from '@walkeros/core';
import { sourceBrowser } from '../index';
import type { Settings } from '../types';

/**
 * Test helper to create browser sources for testing
 * Returns the source instance with elb function for test compatibility
 */
export async function createBrowserSource(
  collector: Collector.Instance,
  settings: Partial<Settings> = {},
): Promise<Source.Instance<Settings> & { elb: Function }> {
  const config: Partial<Source.Config<Settings>> = {
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

  // Use Source.Environment with collector's elb function and browser globals
  const env: Source.Environment = {
    elb: collector.push,
    window,
    document,
  };

  // Call sourceBrowser directly with new pattern
  const source = await sourceBrowser(config, env);

  // Use the source's own push method which includes proper translation
  return { ...source, elb: source.push };
}
