import type { Flow } from '@walkeros/core';

/**
 * The setting Slack needs to deliver: the incoming webhook URL, read from
 * the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { webhookUrl: 'https://hooks.slack.com/services/x/y/z' },
  secrets: { webhookUrl: 'SLACK_WEBHOOK_URL' },
};
