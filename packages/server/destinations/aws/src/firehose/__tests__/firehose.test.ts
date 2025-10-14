import type { Config, Settings, Destination, Env } from '../types';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createEvent, mockEnv } from '@walkeros/core';
import { examples } from '../';

const { env } = examples;

describe('Firehose', () => {
  const event = createEvent();

  let destination: Destination;
  let settingsConfig: Settings;
  let calls: Array<{ path: string[]; args: unknown[] }>;
  let testEnv: Env;

  const streamName = 'demo';

  const mockCollector = {} as Collector.Instance;

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

    jest.clearAllMocks();
    calls = [];

    // Use the example environment directly (no proxy for constructor functions)
    testEnv = env.push;

    // Store the original constructor and replace with a version that uses mocked send
    const OriginalFirehoseClient = testEnv.AWS.FirehoseClient;
    testEnv.AWS.FirehoseClient = class MockFirehoseClient {
      config: unknown;
      send: jest.Mock;

      constructor(config?: unknown) {
        this.config = config;
        this.send = jest.fn().mockResolvedValue({
          RecordId: 'mock-record-id',
          ResponseMetadata: { RequestId: 'mock-request-id' },
        });
      }
    } as unknown as typeof testEnv.AWS.FirehoseClient;

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
          client: expect.any(Object), // Should be MockFirehoseClient
          region: 'eu-central-1',
          streamName,
        },
      },
    });

    // Verify the client is created from the environment
    expect(config.settings.firehose?.client).toBeDefined();
    expect(config.settings.firehose?.client?.config).toEqual({
      region: 'eu-central-1',
    });
  });

  test('push', async () => {
    const config = await getConfig(settingsConfig);
    const mockCollector = {} as Collector.Instance;

    await destination.push(event, {
      config,
      collector: mockCollector,
      env: testEnv,
    });

    // Get the client instance send method
    const clientInstance = config.settings.firehose?.client;

    // Verify that the mock client.send method was called
    expect(clientInstance?.send).toHaveBeenCalledTimes(1);

    // Verify the command was constructed with correct parameters
    const [command] = (clientInstance?.send as jest.Mock).mock.calls[0];
    expect(command.input).toEqual({
      DeliveryStreamName: streamName,
      Records: [{ Data: Buffer.from(JSON.stringify(event)) }],
    });
  });
});
