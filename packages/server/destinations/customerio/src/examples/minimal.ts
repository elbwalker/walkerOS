import type { Flow } from '@walkeros/core';

/**
 * The settings Customer.io needs to deliver: the site ID and the API key,
 * read from the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { siteId: 'YOUR_SITE_ID', apiKey: 'customerio-api-key' },
  secrets: { apiKey: 'CUSTOMERIO_API_KEY' },
};
