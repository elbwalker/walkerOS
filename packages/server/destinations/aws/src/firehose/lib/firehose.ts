import type { Destination, Logger } from '@walkeros/core';
import type { FirehoseConfig, Env } from '../types';
import { throwError } from '@walkeros/core';

// Type guard to check if environment has AWS SDK
function isAWSEnvironment(env: unknown): env is Env {
  return Boolean(
    env &&
      typeof env === 'object' &&
      'AWS' in env &&
      (env as Env).AWS?.FirehoseClient,
  );
}

export function getConfigFirehose(
  firehoseConfig: Partial<FirehoseConfig>,
  env?: unknown,
): FirehoseConfig {
  const { streamName, region = 'eu-central-1', config = {} } = firehoseConfig;

  if (!streamName) throwError('Firehose: Config custom streamName missing');

  if (!config.region) config.region = region;

  // Use environment-injected SDK or fall back to provided client
  let client = firehoseConfig.client;
  if (!client && isAWSEnvironment(env)) {
    client = new env.AWS.FirehoseClient(config);
  }

  return {
    streamName,
    client,
    region,
  };
}

export async function pushFirehose(
  pushEvents: Destination.PushEvents,
  config: FirehoseConfig,
  context: Destination.PushContext,
) {
  const { client, streamName } = config;
  const { env, logger } = context;

  if (!client) return { queue: pushEvents };

  // Up to 500 records per batch
  const records = pushEvents.map(({ event }) => ({
    Data: Buffer.from(JSON.stringify(event)),
  }));

  logger.debug('Calling AWS Firehose API', {
    stream: streamName,
    recordCount: records.length,
  });

  // Use environment-injected SDK command or fall back to direct import
  if (isAWSEnvironment(env)) {
    await client.send(
      new env.AWS.PutRecordBatchCommand({
        DeliveryStreamName: streamName,
        Records: records,
      }),
    );
  } else {
    // Fall back to direct import for backward compatibility
    const { PutRecordBatchCommand } = await import('@aws-sdk/client-firehose');
    await client.send(
      new PutRecordBatchCommand({
        DeliveryStreamName: streamName,
        Records: records,
      }),
    );
  }

  logger?.debug('AWS Firehose API response', { ok: true });
}
