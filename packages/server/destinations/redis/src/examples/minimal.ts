import type { Flow } from '@walkeros/core';

/**
 * The setting Redis needs to deliver: the stream key events are appended to.
 */
export const minimal: Flow.MinimalExample = {
  settings: { redis: { streamKey: 'walkeros:events' } },
};
