import type { Collector, WalkerOS } from '@walkeros/core';
import type { Config, Destination, Env } from '../types';
import { createMockContext, createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

const { env } = examples;

type CallRecord = [string, ...unknown[]];

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const calls: CallRecord[] = [];

    const destination: Destination = jest.requireActual('../').default;
    destination.config = {};

    const testEnv: Env = {
      ...env.push,
      AWS: {
        ...env.push.AWS,
        FirehoseClient: class MockFirehoseClient {
          config: unknown;
          constructor(config?: unknown) {
            this.config = config;
          }
          async send(command: object) {
            const input = 'input' in command ? command.input : undefined;
            calls.push(['client.send', input]);
            return {
              RecordId: 'mock-record-id',
              ResponseMetadata: { RequestId: 'mock-request-id' },
            };
          }
        },
      },
    };

    const expectedCalls = example.out as CallRecord[];
    const firstCall = expectedCalls[0];
    const firstInput = firstCall[1] as { DeliveryStreamName: string };

    const config = (await destination.init({
      config: {
        settings: {
          firehose: {
            region: 'eu-central-1',
            streamName: firstInput.DeliveryStreamName,
          },
        },
      },
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-firehose',
    })) as Config;

    await destination.push(
      example.in as WalkerOS.Event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-firehose',
      }),
    );

    expect(calls).toEqual(expectedCalls);
  });
});
