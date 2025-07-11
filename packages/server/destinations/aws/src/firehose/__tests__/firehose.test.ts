import type { Config, Settings, Destination } from '../types';
import type { WalkerOS } from '@walkerOS/core';
import { createEvent } from '@walkerOS/core';
import {
  FirehoseClient,
  PutRecordBatchCommand,
} from '@aws-sdk/client-firehose';

describe('Firehose', () => {
  const event = createEvent();

  let destination: Destination;
  let settingsConfig: Settings;

  const streamName = 'demo';

  const mockCollector = {} as WalkerOS.Collector;
  const mockWrap = jest.fn((_name, fn) => fn);

  async function getConfig(settings: Settings = {}) {
    const mockCollector = {} as WalkerOS.Collector;
    return (await destination.init({
      config: { settings },
      collector: mockCollector,
      wrap: mockWrap,
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
      onLog: expect.any(Function),
    });
  });

  test('push', async () => {
    const spy = (FirehoseClient.prototype.send = jest.fn());
    const config = await getConfig(settingsConfig);
    const mockCollector = {} as WalkerOS.Collector;

    await destination.push(event, {
      config,
      collector: mockCollector,
      wrap: mockWrap,
    });
    expect(spy).toHaveBeenCalledWith(expect.any(PutRecordBatchCommand));
  });
});
