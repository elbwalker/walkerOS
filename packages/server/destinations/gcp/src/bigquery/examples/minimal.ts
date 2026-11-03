import type { Flow } from '@walkeros/core';

/**
 * The setting BigQuery needs to deliver: the project ID. The credentials come
 * from the Google environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { projectId: 'YOUR_PROJECT_ID' },
};
