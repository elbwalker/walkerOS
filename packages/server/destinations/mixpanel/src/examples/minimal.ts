import type { Flow } from '@walkeros/core';

/**
 * The setting Mixpanel needs to deliver: the project token, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'token' },
  secrets: { apiKey: 'MIXPANEL_API_KEY' },
};
