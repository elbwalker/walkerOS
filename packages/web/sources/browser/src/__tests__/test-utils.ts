import type { WalkerOS, Source, Collector } from '@walkeros/core';
import { createSource } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import type { Settings, BrowserSourceConfig } from '../types';
import type { BrowserPush } from '../types/elb';

/**
 * Test helper to create browser sources for testing
 * Returns a promise that resolves to the source creation result
 */
export async function createBrowserSource(
  collector: Collector.Instance,
  settings: Partial<Settings> = {},
): Promise<Source.CreateSource<BrowserSourceConfig, BrowserPush>> {
  const fullConfig: BrowserSourceConfig = {
    type: 'browser',
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

  return createSource(collector, sourceBrowser, fullConfig);
}
