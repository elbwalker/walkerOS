import type { Flow } from '@walkeros/core';

/** The settings Piano Analytics needs to deliver: the site ID and the collection domain, with the SDK loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { site: 123456789, collectDomain: 'https://example.pa-cd.com' },
  config: { loadScript: true },
};
