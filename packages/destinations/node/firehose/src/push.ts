import { PutRecordCommand } from '@aws-sdk/client-firehose';
import type { Config, PushEvents } from './types';

export const push = async function (events: PushEvents, config: Config) {
  const { client, streamName } = config.custom;
  const record = {
    DeliveryStreamName: streamName,
    Record: {
      Data: Buffer.from(JSON.stringify(events)),
    },
  };

  const response = await client.send(new PutRecordCommand(record));
  console.log('Data sent to Firehose successfully:', response);

  return { queue: [] }; // @TODO
};
