import type { Flow } from '@walkeros/core';

/**
 * The setting Klaviyo needs to deliver: the private API key, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'pk_test_key' },
  secrets: { apiKey: 'KLAVIYO_API_KEY' },
};
