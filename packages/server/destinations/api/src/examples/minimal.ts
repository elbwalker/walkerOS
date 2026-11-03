import type { Flow } from '@walkeros/core';

/**
 * The setting the API destination needs to deliver: the endpoint URL.
 */
export const minimal: Flow.MinimalExample = {
  settings: { url: 'https://api.example.com/events' },
};
