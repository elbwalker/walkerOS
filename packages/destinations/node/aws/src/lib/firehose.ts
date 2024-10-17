import type { Destination } from '@elbwalker/types';
import type { FirehoseConfig } from '../types';
import { throwError } from '@elbwalker/utils';
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

export function getConfigFirehose(
  firehoseConfig: Partial<FirehoseConfig>,
): FirehoseConfig {
  const { streamName, region = 'eu-central-1', config = {} } = firehoseConfig;

  if (!streamName) throwError('Firehose: Config custom streamName missing');

  if (!config.region) config.region = region;

  const client = firehoseConfig.client || new FirehoseClient(config);

  return {
    streamName,
    client,
    region,
  };
}

export async function pushFirehose(
  pushEvents: Destination.PushEvents,
  config: FirehoseConfig,
) {
  const { client, streamName } = config;

  if (!client) return { queue: pushEvents };

  // Up to 500 records per batch
  const records = pushEvents.map(({ event }) => ({
    Data: Buffer.from(JSON.stringify(event)),
  }));

  await client.send(
    new PutRecordBatchCommand({
      DeliveryStreamName: streamName,
      Records: records,
    }),
  );
}
