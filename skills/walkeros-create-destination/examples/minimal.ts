import type { Flow } from '@walkeros/core';

/** The settings the vendor needs to deliver: the API key, with the vendor script loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'YOUR_API_KEY' },
  config: { loadScript: true },
};
