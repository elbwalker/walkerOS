import type { Flow } from '@walkeros/core';

/** The settings Plausible needs to deliver: the site domain, with the Plausible script loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { domain: 'example.com' },
  config: { loadScript: true },
};
