import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import type { Logger } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { Config, Env, Setup, SetupFn } from './types';

const DEFAULT_REGION = 'eu-central-1';
const DEFAULT_VISIBILITY_TIMEOUT_SECONDS = 30;
const DEFAULT_MESSAGE_RETENTION_SECONDS = 345600;
const DEFAULT_MAXIMUM_MESSAGE_SIZE = 262144;
const DEFAULT_DLQ_MAX_RECEIVE_COUNT = 5;
const DLQ_RETENTION_SECONDS = 1209600; // 14 days, AWS max

export const DEFAULT_SETUP: Setup = {
  region: DEFAULT_REGION,
  fifoQueue: false,
  visibilityTimeoutSeconds: DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
  messageRetentionSeconds: DEFAULT_MESSAGE_RETENTION_SECONDS,
  maximumMessageSize: DEFAULT_MAXIMUM_MESSAGE_SIZE,
};

export interface SetupResult {
  queueCreated: boolean;
  queueUrl: string;
  queueArn: string;
  dlqCreated?: boolean;
  dlqArn?: string;
  subscriptionArn?: string;
}

interface QueueExistsError {
  name: string;
}

function hasName(err: unknown): err is QueueExistsError {
  if (typeof err !== 'object' || err === null) return false;
  const obj: { name?: unknown } = err;
  return typeof obj.name === 'string';
}

function isQueueNameExists(err: unknown): boolean {
  if (!hasName(err)) return false;
  return (
    err.name === 'QueueNameExists' ||
    err.name === 'QueueAlreadyExists' ||
    err.name === 'AWS.SimpleQueueService.QueueNameExists'
  );
}

interface BuildQueueAttributesArgs {
  options: Setup;
  dlqArn: string | undefined;
  queuePolicy: string | undefined;
}

function buildQueueAttributes(
  args: BuildQueueAttributesArgs,
): Record<string, string> {
  const { options, dlqArn, queuePolicy } = args;
  const attrs: Record<string, string> = {};
  attrs.VisibilityTimeout = String(
    options.visibilityTimeoutSeconds ?? DEFAULT_VISIBILITY_TIMEOUT_SECONDS,
  );
  attrs.MessageRetentionPeriod = String(
    options.messageRetentionSeconds ?? DEFAULT_MESSAGE_RETENTION_SECONDS,
  );
  attrs.MaximumMessageSize = String(
    options.maximumMessageSize ?? DEFAULT_MAXIMUM_MESSAGE_SIZE,
  );
  if (options.kmsMasterKeyId) {
    attrs.KmsMasterKeyId = options.kmsMasterKeyId;
  }
  if (options.fifoQueue) {
    attrs.FifoQueue = 'true';
    attrs.ContentBasedDeduplication = 'true';
  }
  if (dlqArn) {
    const maxReceiveCount =
      options.deadLetterQueue?.maxReceiveCount ?? DEFAULT_DLQ_MAX_RECEIVE_COUNT;
    attrs.RedrivePolicy = JSON.stringify({
      deadLetterTargetArn: dlqArn,
      maxReceiveCount,
    });
  }
  if (queuePolicy) {
    attrs.Policy = queuePolicy;
  }
  return attrs;
}

function buildDlqAttributes(args: {
  fifoQueue: boolean;
  kmsMasterKeyId?: string;
}): Record<string, string> {
  const attrs: Record<string, string> = {};
  attrs.MessageRetentionPeriod = String(DLQ_RETENTION_SECONDS);
  if (args.kmsMasterKeyId) {
    attrs.KmsMasterKeyId = args.kmsMasterKeyId;
  }
  if (args.fifoQueue) {
    attrs.FifoQueue = 'true';
    attrs.ContentBasedDeduplication = 'true';
  }
  return attrs;
}

function buildDlqTags(
  parentTags: Record<string, string> | undefined,
): Record<string, string> {
  return {
    ...(parentTags ?? {}),
    walkerOS: 'dlq',
  };
}

interface BuildPolicyArgs {
  sourceId: string;
  topicArn: string;
}

function buildSnsQueuePolicy(args: BuildPolicyArgs): string {
  // Placeholder Resource value; AWS does not require it to match the actual
  // queue ARN at policy-attach time when the queue is being created in the
  // same call. The Sid keys the statement so re-runs upsert in place.
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: `walkerOSAllowSNSPublish-${args.sourceId}`,
        Effect: 'Allow',
        Principal: { Service: 'sns.amazonaws.com' },
        Action: 'SQS:SendMessage',
        Resource: '*',
        Condition: {
          ArnEquals: {
            'aws:SourceArn': args.topicArn,
          },
        },
      },
    ],
  });
}

interface EnsureQueueArgs {
  sqs: SQSClient;
  logger: Logger.Instance;
  queueName: string;
  attributes: Record<string, string>;
  tags?: Record<string, string>;
}

interface EnsureQueueResult {
  queueCreated: boolean;
  queueUrl: string;
  queueArn: string;
}

/**
 * Authoritative-apply: a single CreateQueueCommand with the full declared
 * attribute map and tags. AWS treats identical inputs as success; on
 * QueueNameExists (different attrs) we hard-fail with an actionable message.
 * Setup never calls SetQueueAttributesCommand.
 */
async function ensureQueue(args: EnsureQueueArgs): Promise<EnsureQueueResult> {
  const { sqs, logger, queueName, attributes, tags } = args;
  let queueUrl: string;
  let queueCreated = false;
  try {
    const res = await sqs.send(
      new CreateQueueCommand({
        QueueName: queueName,
        Attributes: attributes,
        tags,
      }),
    );
    queueUrl = res.QueueUrl ?? '';
    queueCreated = true;
    logger.info(`SQS queue "${queueName}" created.`);
  } catch (err) {
    if (isQueueNameExists(err)) {
      const message = err instanceof Error ? err.message : String(err);
      return logger.throw(
        `SQS queue "${queueName}" exists with different attributes (${message}). ` +
          `Setup will not mutate an existing queue's attributes. Delete or rename the queue, then re-run setup.`,
      );
    }
    throw err;
  }
  if (!queueUrl) {
    return logger.throw(
      `SQS CreateQueueCommand returned no QueueUrl for "${queueName}".`,
    );
  }
  // Fetch QueueArn for downstream Subscribe / RedrivePolicy use.
  const attrsRes = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn'],
    }),
  );
  const queueArn = attrsRes.Attributes?.QueueArn ?? '';
  if (!queueArn) {
    return logger.throw(
      `SQS GetQueueAttributesCommand returned no QueueArn for "${queueName}".`,
    );
  }
  return { queueCreated, queueUrl, queueArn };
}

function dlqName(queueName: string, fifo: boolean): string {
  if (fifo) {
    // FIFO queue names must end in .fifo. Strip the suffix if present, append -dlq, then re-add.
    const base = queueName.endsWith('.fifo')
      ? queueName.slice(0, -'.fifo'.length)
      : queueName;
    return `${base}-dlq.fifo`;
  }
  return `${queueName}-dlq`;
}

export const setup: SetupFn = async (context) => {
  const { id, config, env, logger } = context;

  const merged = resolveSetup<Setup>(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('SQS source setup skipped (config.setup is falsy).');
    return undefined;
  }
  const options: Setup = { ...DEFAULT_SETUP, ...merged };

  const settings = config.settings;
  if (!settings) return logger.throw('setup: settings missing');

  const queueName = settings.queueName;
  if (!queueName) return logger.throw('setup: settings.queueName is missing');

  const region = options.region ?? DEFAULT_REGION;

  // Construct clients via env override (tests) or static SDK import (prod).
  const SqsCtor = env.AWS?.SQSClient ?? SQSClient;
  const sqs = new SqsCtor({ region });

  // 1. Optional DLQ first (so we have its ARN for RedrivePolicy on the main queue).
  let dlqArn: string | undefined;
  let dlqCreated = false;
  if (options.deadLetterQueue?.arn) {
    dlqArn = options.deadLetterQueue.arn;
  } else if (options.deadLetterQueue?.create) {
    const dlqResult = await ensureQueue({
      sqs,
      logger,
      queueName: dlqName(queueName, options.fifoQueue ?? false),
      attributes: buildDlqAttributes({
        fifoQueue: options.fifoQueue ?? false,
        kmsMasterKeyId: options.kmsMasterKeyId,
      }),
      tags: buildDlqTags(options.tags),
    });
    dlqArn = dlqResult.queueArn;
    dlqCreated = dlqResult.queueCreated;
  }

  // 2. Main queue.
  const finalQueueName = options.fifoQueue
    ? queueName.endsWith('.fifo')
      ? queueName
      : `${queueName}.fifo`
    : queueName;
  const queuePolicy = options.subscribeToSnsTopic
    ? buildSnsQueuePolicy({
        sourceId: id,
        topicArn: options.subscribeToSnsTopic.topicArn,
      })
    : undefined;

  const mainAttrs = buildQueueAttributes({
    options,
    dlqArn,
    queuePolicy,
  });
  const mainResult = await ensureQueue({
    sqs,
    logger,
    queueName: finalQueueName,
    attributes: mainAttrs,
    tags: options.tags,
  });

  // 3. Optional SNS subscription.
  let subscriptionArn: string | undefined;
  if (options.subscribeToSnsTopic) {
    const SnsCtor = env.AWS?.SNSClient ?? SNSClient;
    const sns = new SnsCtor({ region });
    const subAttrs: Record<string, string> = {};
    if (options.subscribeToSnsTopic.rawMessageDelivery) {
      subAttrs.RawMessageDelivery = 'true';
    }
    if (options.subscribeToSnsTopic.filterPolicy) {
      subAttrs.FilterPolicy = JSON.stringify(
        options.subscribeToSnsTopic.filterPolicy,
      );
    }
    const subscribeRes = await sns.send(
      new SubscribeCommand({
        TopicArn: options.subscribeToSnsTopic.topicArn,
        Protocol: 'sqs',
        Endpoint: mainResult.queueArn,
        Attributes: Object.keys(subAttrs).length > 0 ? subAttrs : undefined,
        ReturnSubscriptionArn: true,
      }),
    );
    subscriptionArn = subscribeRes.SubscriptionArn ?? undefined;
    logger.info('SQS source setup: SNS subscription created', {
      topicArn: options.subscribeToSnsTopic.topicArn,
      subscriptionArn,
    });
  }

  const result: SetupResult = {
    queueCreated: mainResult.queueCreated,
    queueUrl: mainResult.queueUrl,
    queueArn: mainResult.queueArn,
    dlqCreated: dlqArn ? dlqCreated : undefined,
    dlqArn,
    subscriptionArn,
  };
  return result;
};
