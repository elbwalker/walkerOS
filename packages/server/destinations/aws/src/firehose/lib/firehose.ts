import type { Destination } from '@walkeros/core';
import type { FirehoseConfig, Environment } from '../types';
import { throwError } from '@walkeros/core';

// Type guard to check if environment has AWS SDK
function isAWSEnvironment(env: unknown): env is Environment {
  return Boolean(
    env &&
      typeof env === 'object' &&
      'AWS' in env &&
      (env as Environment).AWS?.FirehoseClient,
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
  env?: unknown,
) {
  const { client, streamName } = config;

  if (!client) return { queue: pushEvents };

  // Up to 500 records per batch
  const records = pushEvents.map(({ event }) => ({
    Data: Buffer.from(JSON.stringify(event)),
  }));

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
}
