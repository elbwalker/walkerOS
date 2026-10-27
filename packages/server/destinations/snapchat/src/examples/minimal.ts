import type { Flow } from '@walkeros/core';

/**
 * The settings Snapchat needs to deliver: the access token, read from the
 * environment, and the pixel ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', pixelId: 'YOUR_PIXEL_ID' },
  secrets: { accessToken: 'SNAPCHAT_ACCESS_TOKEN' },
};
