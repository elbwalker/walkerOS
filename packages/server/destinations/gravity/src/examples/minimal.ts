import type { Flow } from '@walkeros/core';

/**
 * The settings Gravity needs to deliver: the API key, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 's3cr3t' },
  secrets: { apiKey: 'GRAVITY_API_KEY' },
};
