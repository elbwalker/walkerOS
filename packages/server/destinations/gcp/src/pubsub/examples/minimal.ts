import type { Flow } from '@walkeros/core';

/**
 * The settings Pub/Sub needs to deliver: the project ID and the topic. The
 * credentials come from the Google environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { projectId: 'YOUR_PROJECT_ID', topic: 'events' },
};
