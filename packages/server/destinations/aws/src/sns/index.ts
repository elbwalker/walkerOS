import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';
import { setup } from './setup';
import { isAWSEnvironment } from './lib/sns';

// Types
export * as DestinationSNS from './types';

interface CreateTopicResponse {
  TopicArn?: string;
}

function isCreateTopicResponse(v: unknown): v is CreateTopicResponse {
  return typeof v === 'object' && v !== null;
}

export const destinationSNS: Destination = {
  type: 'aws-sns',

  config: {},

  setup,

  async init({ config: partial, env, logger, id }) {
    const config = getConfig(partial, env);
    if (!config.settings.client) {
      logger.throw('SNS init: client missing (env not injected)');
      return;
    }
    if (!isAWSEnvironment(env)) {
      logger.throw('SNS init: env.AWS missing');
      return;
    }

    // Operator-supplied ARN: skip CreateTopic to avoid the runtime IAM cost.
    if (config.settings.topicArn) return config;

    const { client, topicName, region } = config.settings;
    try {
      const res: unknown = await client.send(
        new env.AWS.CreateTopicCommand({ Name: topicName }),
      );
      if (
        !isCreateTopicResponse(res) ||
        typeof res.TopicArn !== 'string' ||
        res.TopicArn.length === 0
      ) {
        logger.throw(
          `SNS init: CreateTopic returned no ARN for "${topicName}"`,
        );
        return;
      }
      config.settings.topicArn = res.TopicArn;
    } catch (err) {
      logger.error(
        `SNS init failed for topic "${topicName}" in region ${region ?? 'eu-central-1'}. ` +
          `Either set settings.topicArn directly, run "walkeros setup destination.${id}", ` +
          `or grant sns:CreateTopic to the runtime role.`,
        {
          topicName,
          region,
          error: err instanceof Error ? err.message : String(err),
        },
      );
      throw err;
    }

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationSNS;
