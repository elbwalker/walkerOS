import type { Flow } from '@walkeros/core';

/**
 * The settings Reditus needs to deliver: the API token, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 's3cr3t' },
  secrets: { apiKey: 'REDITUS_API_KEY' },
};
