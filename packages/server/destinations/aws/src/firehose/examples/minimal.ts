import type { Flow } from '@walkeros/core';

/**
 * The setting Firehose needs to deliver: the stream name. The region and the
 * credentials come from the AWS environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { streamName: 'walkeros-events' },
};
