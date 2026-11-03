import type { Flow } from '@walkeros/core';

/**
 * The settings Bing Ads needs to deliver: the access token, read from the
 * environment, and the UET tag ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', tagId: 'UET-12345' },
  secrets: { accessToken: 'BING_ACCESS_TOKEN' },
};
