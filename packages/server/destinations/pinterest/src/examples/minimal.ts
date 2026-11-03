import type { Flow } from '@walkeros/core';

/**
 * The settings Pinterest needs to deliver: the access token, read from the
 * environment, and the ad account ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', adAccountId: '123456789' },
  secrets: { accessToken: 'PINTEREST_ACCESS_TOKEN' },
};
