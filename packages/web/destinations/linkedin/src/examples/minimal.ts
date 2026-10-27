import type { Flow } from '@walkeros/core';

/**
 * The settings the Insight Tag needs to deliver: the Partner ID, with the
 * Insight Tag script loaded by the destination.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: '123456' },
  config: { loadScript: true },
};
