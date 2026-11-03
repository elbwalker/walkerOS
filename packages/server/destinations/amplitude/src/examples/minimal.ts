import type { Flow } from '@walkeros/core';

/**
 * The settings Amplitude needs to deliver: the project API key, read from
 * the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'test-api-key' },
  secrets: { apiKey: 'AMPLITUDE_API_KEY' },
};
