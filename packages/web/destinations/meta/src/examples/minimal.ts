import type { Flow } from '@walkeros/core';

/** The settings the Meta Pixel needs to deliver: the Pixel ID, with the Pixel script loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: { pixelId: '1234567890' },
  config: { loadScript: true },
};
