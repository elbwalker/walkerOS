import type {
  CreateQueueCommandOutput,
  DeleteMessageCommandOutput,
  GetQueueAttributesCommandOutput,
  GetQueueUrlCommandOutput,
  ReceiveMessageCommandOutput,
} from '@aws-sdk/client-sqs';
import { Level, StepError } from '@walkeros/core';
import type { Collector, Destination } from '@walkeros/core';
import { createTrigger } from '../examples/trigger';
import { sourceSqs } from '../index';
import type { SqsClient } from '../types';

// Acknowledgement of a consumed message, proven on a real collector: the
// source deletes a message unless a redelivery could still deliver it.

type SqsResponse = GetQueueUrlCommandOutput &
  GetQueueAttributesCommandOutput &
  ReceiveMessageCommandOutput &
  DeleteMessageCommandOutput &
  CreateQueueCommandOutput;

/** Answers every command with an empty response; the loop idles. */
class IdleClient implements SqsClient {
  async send(): Promise<SqsResponse> {
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    return { $metadata: {}, Messages: [] };
  }

  destroy(): void {}
}

const failing = (error: Error): Destination.Instance => ({
  type: 'failing',
  config: {},
  push: () => {
    throw error;
  },
});

const delivering: Destination.Instance = {
  type: 'delivering',
  config: {},
  push: () => undefined,
};

const deterministic = () =>
  new StepError('setting apiKey is missing', { code: 'config' });
const retryable = () =>
  new StepError('vendor answered 503', { code: 'transport', status: 503 });

const lines: Array<[Level, string]> = [];

async function consume(
  destination: Destination.Instance,
  body: unknown,
  onPushError?: 'ack' | 'nack',
): Promise<{
  result: Array<[string, ...unknown[]]>;
  status: Collector.Status;
}> {
  const instance = await createTrigger({
    logger: { handler: (level, message) => void lines.push([level, message]) },
    sources: {
      sqs: {
        code: sourceSqs,
        config: {
          settings: {
            queueName: 'walkeros-events',
            queueUrl:
              'https://sqs.eu-central-1.amazonaws.com/000000000000/walkeros-events',
            client: new IdleClient(),
            ...(onPushError ? { onPushError } : {}),
          },
        },
      },
    },
    destinations: { vendorX: { code: destination } },
  });
  try {
    const result = await instance.trigger()({
      MessageId: 'm1',
      Body: JSON.stringify(body),
      ReceiptHandle: 'r1',
    });
    const status = instance.flow?.collector.status;
    if (!status) throw new Error('flow did not start');
    return { result, status };
  } finally {
    await instance.flow?.collector.command('shutdown');
  }
}

describe('SQS acknowledgement', () => {
  beforeEach(() => {
    lines.length = 0;
  });

  it('deletes a delivered message', async () => {
    const { result } = await consume(delivering, { name: 'page view' });
    expect(result).toEqual([['message.ack', 'm1']]);
  });

  it('deletes a message whose failure a redelivery cannot fix', async () => {
    const { result, status } = await consume(failing(deterministic()), {
      name: 'page view',
    });
    expect(result).toEqual([['message.ack', 'm1']]);
    expect(status.destinations.vendorX.failed).toBe(1);
    // The failure is visible at the default level through the collector.
    expect(lines.some(([level]) => level === Level.ERROR)).toBe(true);
  });

  it('keeps a message a redelivery could still deliver', async () => {
    const { result } = await consume(failing(retryable()), {
      name: 'page view',
    });
    expect(result).toEqual([['message.nack', 'm1']]);
    // One cause line from the collector, no per-message handler error.
    expect(lines).toContainEqual([Level.ERROR, expect.any(String)]);
    expect(lines).not.toContainEqual([
      Level.ERROR,
      'SQS message handler failed',
    ]);
  });

  it("deletes a retryable failure when onPushError is 'ack'", async () => {
    const { result } = await consume(
      failing(retryable()),
      { name: 'page view' },
      'ack',
    );
    expect(result).toEqual([['message.ack', 'm1']]);
  });

  it('deletes invalid input and counts it as rejected', async () => {
    const { result, status } = await consume(delivering, { name: 'invalid' });
    expect(result).toEqual([['message.ack', 'm1']]);
    expect(status.sources.sqs.rejected).toBe(1);
  });
});
