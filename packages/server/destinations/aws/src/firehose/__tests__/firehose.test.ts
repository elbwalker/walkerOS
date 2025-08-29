import type { Config, Settings, Destination } from '../types';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createEvent } from '@walkeros/core';
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

describe('Firehose', () => {
  const event = createEvent();

  let destination: Destination;
  let settingsConfig: Settings;

  const streamName = 'demo';

  const mockCollector = {} as Collector.Instance;
  const testEnv = {};

  async function getConfig(settings: Settings = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings },
      collector: mockCollector,
      env: testEnv,
    })) as Config;
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
    });
  });

  test('push', async () => {
    const spy = (FirehoseClient.prototype.send = jest.fn());
    const config = await getConfig(settingsConfig);
    const mockCollector = {} as Collector.Instance;

    await destination.push(event, {
      config,
      collector: mockCollector,
      env: testEnv,
    });
    expect(spy).toHaveBeenCalledWith(expect.any(PutRecordBatchCommand));
  });
});
