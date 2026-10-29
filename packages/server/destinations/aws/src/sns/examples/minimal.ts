import type { Flow } from '@walkeros/core';

/**
 * The setting SNS needs to deliver: the topic ARN. The credentials come from
 * the AWS environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    topicArn: 'arn:aws:sns:eu-central-1:123456789012:walkeros-events',
  },
};
