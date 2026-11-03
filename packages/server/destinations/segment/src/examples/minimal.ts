import type { Flow } from '@walkeros/core';

/**
 * The setting Segment needs to deliver: the write key, read from the
 * environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { writeKey: 'test-write-key' },
  secrets: { writeKey: 'SEGMENT_WRITE_KEY' },
};
