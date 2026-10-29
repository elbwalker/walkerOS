import type { Flow } from '@walkeros/core';

/**
 * The settings TikTok needs to deliver: the access token, read from the
 * environment, and the pixel code.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', pixelCode: 'PIXEL_CODE' },
  secrets: { accessToken: 'TIKTOK_ACCESS_TOKEN' },
};
