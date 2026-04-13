import type { Destination, Settings, SlackClientMock } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationSlack from './types';

const RETRY_PRESETS: Record<string, unknown> = {
  default: undefined,
  fiveRetriesInFiveMinutes: { retries: 5, factor: 1.96 },
  none: { retries: 0 },
};

export const destinationSlack: Destination = {
  type: 'slack',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Webhook mode -- nothing to initialize.
    if (settings.webhookUrl) return config;

    // Web API mode -- prefer mock client from env (testing).
    const envClient = (env as { slackClient?: SlackClientMock } | undefined)
      ?.slackClient;
    if (envClient) return config;

    // Production path: lazily load @slack/web-api so webhook-only users
    // do not pay for the SDK import cost.
    try {
      const { WebClient } = require('@slack/web-api');
      const retryConfig = RETRY_PRESETS[settings.retryConfig || 'default'];
      settings._client = new WebClient(settings.token, {
        ...(retryConfig !== undefined ? { retryConfig } : {}),
      });
    } catch (err) {
      logger.throw(`Failed to initialize Slack WebClient: ${err}`);
    }

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationSlack;
