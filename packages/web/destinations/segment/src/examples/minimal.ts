import type { Flow } from '@walkeros/core';

/** The settings Segment needs to deliver: the source write key. */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'YOUR_SEGMENT_WRITE_KEY' },
};
