import { Level, StepError } from '@walkeros/core';
import type { Collector, Destination } from '@walkeros/core';
import { createTrigger } from '../examples/trigger';
import type { Result } from '../examples/trigger';
import { sourcePubSubPull } from '../index';
import type { PubSubPullClient } from '../types';

// Acknowledgement of a pulled message, proven on a real collector: the source
// acks a message unless a redelivery could still deliver it.

const client: PubSubPullClient = {
  subscription: () => ({ on: () => undefined, close: async () => {} }),
  close: async () => {},
};

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
): Promise<{ result: Result; status: Collector.Status }> {
  const instance = await createTrigger({
    logger: { handler: (level, message) => void lines.push([level, message]) },
    sources: {
      pubsub: {
        code: sourcePubSubPull,
        config: {
          settings: {
            projectId: 'project',
            subscription: 'events',
            client,
            ...(onPushError ? { onPushError } : {}),
          },
        },
      },
    },
    destinations: { vendorX: { code: destination } },
  });
  try {
    const result = await instance.trigger()({
      id: 'm1',
      dataString: JSON.stringify(body),
    });
    const status = instance.flow?.collector.status;
    if (!status) throw new Error('flow did not start');
    return { result, status };
  } finally {
    await instance.flow?.collector.command('shutdown');
  }
}

describe('Pub/Sub pull acknowledgement', () => {
  beforeEach(() => {
    lines.length = 0;
  });

  it('acks a delivered message', async () => {
    const { result } = await consume(delivering, { name: 'page view' });
    expect(result).toEqual([['message.ack', 'm1']]);
  });

  it('acks a message whose failure a redelivery cannot fix', async () => {
    const { result, status } = await consume(failing(deterministic()), {
      name: 'page view',
    });
    expect(result).toEqual([['message.ack', 'm1']]);
    expect(status.destinations.vendorX.failed).toBe(1);
    // The failure is visible at the default level through the collector.
    expect(lines.some(([level]) => level === Level.ERROR)).toBe(true);
  });

  it('nacks a message a redelivery could still deliver', async () => {
    const { result } = await consume(failing(retryable()), {
      name: 'page view',
    });
    expect(result).toEqual([['message.nack', 'm1']]);
    // One cause line from the collector, no per-message handler error.
    expect(lines).toContainEqual([Level.ERROR, expect.any(String)]);
    expect(lines).not.toContainEqual([
      Level.ERROR,
      'Pub/Sub message handler failed',
    ]);
  });

  it("acks a retryable failure when onPushError is 'ack'", async () => {
    const { result } = await consume(
      failing(retryable()),
      { name: 'page view' },
      'ack',
    );
    expect(result).toEqual([['message.ack', 'm1']]);
  });

  it('acks invalid input and counts it as rejected', async () => {
    const { result, status } = await consume(delivering, { name: 'invalid' });
    expect(result).toEqual([['message.ack', 'm1']]);
    expect(status.sources.pubsub.rejected).toBe(1);
  });
});
