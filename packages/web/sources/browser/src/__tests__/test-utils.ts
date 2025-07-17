import type { WalkerOS, Source } from '@walkerOS/core';
import { createSource } from '@walkerOS/core';
import { sourceBrowser } from '../index';
import type { Settings, BrowserSourceConfig } from '../types';
import type { BrowserPush } from '../types/elb';

/**
 * Test helper to create browser sources for testing
 * Returns a promise that resolves to the source creation result
 */
export async function createBrowserSource(
  collector: WalkerOS.Collector,
  settings: Partial<Settings> = {},
): Promise<Source.CreateSource<BrowserSourceConfig, BrowserPush>> {
  const fullConfig: BrowserSourceConfig = {
    type: 'browser',
    settings: {
      prefix: 'data-elb',
      scope: document,
      pageview: true,
      session: false, // Disabled by default in tests to avoid extra events
      elb: 'elb',
      name: 'walkerjs',
      elbLayer: 'elbLayer',
      ...settings,
    },
  };

  return createSource(collector, sourceBrowser, fullConfig);
}
