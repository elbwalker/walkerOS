import type { Flow } from '@walkeros/core';

/** The settings Snowplow needs to deliver: the collector URL, with the Snowplow script loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { collectorUrl: 'https://collector.example.com' },
  config: { loadScript: true },
};
