import type { Config, Settings, Destination } from '../types';
import { createEvent } from '@walkerOS/core';
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

describe('Firehose', () => {
  let destination: Destination;
  let settingsConfig: Settings;

  const event = createEvent();

  const streamName = 'demo';

  async function getConfig(settings: Settings = {}) {
    return (await destination.init({ settings })) as Config;
  }

  beforeEach(() => {
    destination = jest.requireActual('../').default;
    destination.config = {};
    settingsConfig = {
      firehose: {
        region: 'eu-central-1',
        streamName,
      },
    };
  });

  test('init', async () => {
    const config = await getConfig(settingsConfig);
    expect(config).toEqual({
      settings: {
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
    const config = await getConfig(settingsConfig);

    await destination.push(event, config);
    expect(spy).toHaveBeenCalledWith(expect.any(PutRecordBatchCommand));
  });
});
