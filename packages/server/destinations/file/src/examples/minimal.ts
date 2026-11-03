import type { Flow } from '@walkeros/core';

/**
 * The setting the file destination needs to deliver: the path of the JSON
 * Lines file.
 */
export const minimal: Flow.MinimalExample = {
  settings: { filename: 'events.jsonl' },
};
