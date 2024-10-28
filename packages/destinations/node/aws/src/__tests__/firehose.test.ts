import type { Config, CustomConfig, Destination } from '../types';
import { createEvent } from '@elbwalker/utils';
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

describe('Firehose', () => {
  let destination: Destination;
  let customConfig: CustomConfig;

  const event = createEvent();

  const streamName = 'demo';

  async function getConfig(custom: CustomConfig = {}) {
    return (await destination.init({ custom })) as Config;
  }

  beforeEach(() => {
    destination = jest.requireActual('../').default;
    destination.config = {};
    customConfig = {
      firehose: {
        region: 'eu-central-1',
        streamName,
      },
    };
  });

  test('init', async () => {
    const config = await getConfig(customConfig);
    expect(config).toEqual({
      custom: {
        firehose: {
          client: expect.any(FirehoseClient),
          region: 'eu-central-1',
          streamName,
        },
      },
      onLog: expect.any(Function),
    });
  });

  test('push', async () => {
    const spy = (FirehoseClient.prototype.send = jest.fn());
    const config = await getConfig(customConfig);

    await destination.push(event, config);
    expect(spy).toHaveBeenCalledWith(expect.any(PutRecordBatchCommand));
  });
});
