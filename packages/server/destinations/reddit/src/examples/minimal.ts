import type { Flow } from '@walkeros/core';

/**
 * The settings Reddit needs to deliver: the access token, read from the
 * environment, and the pixel ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', pixelId: 'a2_abcdef123456' },
  secrets: { accessToken: 'REDDIT_ACCESS_TOKEN' },
};
