import type { Flow } from '@walkeros/core';

/**
 * The settings the Conversions API needs to deliver: the access token, read
 * from the environment, and the Pixel ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', pixelId: '1234567890' },
  secrets: { accessToken: 'META_ACCESS_TOKEN' },
};
