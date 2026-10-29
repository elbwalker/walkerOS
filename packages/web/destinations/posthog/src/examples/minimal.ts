import type { Flow } from '@walkeros/core';

/** The settings PostHog needs to deliver: the project API key. */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'phc_a1b2c3d4e5f6789012345678abcdef12' },
};
