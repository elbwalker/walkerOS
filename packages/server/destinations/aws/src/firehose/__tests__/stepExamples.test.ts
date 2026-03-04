import type { Config, Destination, Env } from '../types';
import type { Collector, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

const { env } = examples;

describe('Step Examples', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn().mockResolvedValue({
      RecordId: 'mock-record-id',
      ResponseMetadata: { RequestId: 'mock-request-id' },
    });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const destination: Destination = jest.requireActual('../').default;
    destination.config = {};

    const testEnv: Env = {
      ...env.push,
      AWS: {
        ...env.push.AWS,
        FirehoseClient: class MockFirehoseClient {
          config: unknown;
          send = mockSend;
          constructor(config?: unknown) {
            this.config = config;
          }
        } as unknown as Env['AWS']['FirehoseClient'],
      },
    };

    const expectedOut = example.out as {
      DeliveryStreamName: string;
      Records: Array<{ Data: string }>;
    };

    const config = (await destination.init({
      config: {
        settings: {
          firehose: {
            region: 'eu-central-1',
            streamName: expectedOut.DeliveryStreamName,
          },
        },
      },
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-firehose',
    })) as Config;

    await destination.push(example.in as WalkerOS.Event, {
      config,
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-firehose',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.DeliveryStreamName).toBe(
      expectedOut.DeliveryStreamName,
    );
    expect(command.input.Records).toHaveLength(expectedOut.Records.length);

    // Firehose sends full event; step example Data shows event.data
    for (let i = 0; i < expectedOut.Records.length; i++) {
      const actualEvent = JSON.parse(command.input.Records[i].Data.toString());
      const expectedData = JSON.parse(expectedOut.Records[i].Data);
      expect(actualEvent.data).toEqual(expect.objectContaining(expectedData));
    }
  });
});
