import type { Flow } from '@walkeros/core';

/**
 * The settings HubSpot needs to deliver: the access token, read from the
 * environment, and the event name prefix.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    accessToken: 'pat-test-xxx',
    eventNamePrefix: 'YOUR_EVENT_NAME_PREFIX',
  },
  secrets: { accessToken: 'HUBSPOT_ACCESS_TOKEN' },
};
