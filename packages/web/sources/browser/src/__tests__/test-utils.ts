import type { Source, Collector } from '@walkeros/core';
import { sourceBrowser } from '../index';
import type { Types } from '../types';

/**
 * Test helper to create browser sources for testing
 * Returns the source instance with elb function for test compatibility
 */
export async function createBrowserSource(
  collector: Collector.Instance,
  settings: Partial<Source.Settings<Types>> = {},
): Promise<Source.Instance<Types> & { elb: Function }> {
  const config: Partial<Source.Config<Types>> = {
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: false,
      session: false,
      elb: 'elb',
      elbLayer: 'elbLayer',
      ...settings,
    },
  };

  // Use Source.Env with collector's elb function and browser globals
  const env: Source.Env<Types> = {
    elb: collector.push,
    window,
    document,
  };

  // Call sourceBrowser directly with new pattern
  const source = await sourceBrowser(config, env);

  // Use the source's own push method which includes proper translation
  return { ...source, elb: source.push };
}
