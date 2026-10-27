import type { Flow } from '@walkeros/core';

/**
 * The setting PostHog needs to deliver: the project API key, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'phc_test' },
  secrets: { apiKey: 'POSTHOG_API_KEY' },
};
