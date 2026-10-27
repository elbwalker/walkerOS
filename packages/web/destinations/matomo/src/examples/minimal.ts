import type { Flow } from '@walkeros/core';

/** The settings Matomo needs to deliver: the site ID and the instance URL, with matomo.js loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { siteId: '1', url: 'https://analytics.example.com/' },
  config: { loadScript: true },
};
