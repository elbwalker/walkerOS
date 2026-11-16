import type { Flow } from '@walkeros/core';

/**
 * The settings Matomo needs to deliver: the base URL and the site ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    url: 'https://matomo.example.com/',
    siteId: '1',
  },
};
