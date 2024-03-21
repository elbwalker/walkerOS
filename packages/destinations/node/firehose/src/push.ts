import { PutRecordBatchCommand } from '@aws-sdk/client-firehose';
import type { Config, PushEvents } from './types';

export const push = async function (events: PushEvents, config: Config) {
  const { client, streamName } = config.custom;

  // Up to 500 records per batch
  const records = events.map((event) => ({
    Data: Buffer.from(JSON.stringify(event)),
  }));

  await client.send(
    new PutRecordBatchCommand({
      DeliveryStreamName: streamName,
      Records: records,
    }),
  );

  return { queue: [] }; // @TODO
};
