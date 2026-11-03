import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';
import { createTrigger } from '../examples/trigger';
import { sourcePubSubPush } from '../index';

// The HTTP answer to a pushed message, proven on a real collector: 200 unless
// a redelivery could still deliver the event (500) or the input is invalid
// (400). The body never names a destination.

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

async function deliver(
  destination: Destination.Instance,
  event: unknown,
): Promise<{ status: unknown; body: unknown }> {
  const instance = await createTrigger({
    logger: { handler: () => undefined },
    sources: { pubsub: { code: sourcePubSubPush } },
    destinations: { vendorX: { code: destination } },
  });
  try {
    const [[, status, body]] = await instance.trigger()({
      message: {
        messageId: 'm1',
        data: Buffer.from(JSON.stringify(event)).toString('base64'),
      },
      subscription: 'projects/project/subscriptions/events',
    });
    return { status, body };
  } finally {
    await instance.flow?.collector.command('shutdown');
  }
}

describe('Pub/Sub push acknowledgement', () => {
  it('answers 200 for a delivered message', async () => {
    const { status, body } = await deliver(delivering, { name: 'page view' });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, id: 'm1' });
  });

  it('answers 200 with the success body for a failure a redelivery cannot fix', async () => {
    const { status, body } = await deliver(failing(deterministic()), {
      name: 'page view',
    });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, id: 'm1' });
  });

  it('answers 500 when a redelivery could still deliver the message', async () => {
    const { status, body } = await deliver(failing(retryable()), {
      name: 'page view',
    });
    expect(status).toBe(500);
    expect(body).toEqual({ success: false, error: 'Event was not processed' });
  });

  it('answers 400 for invalid input', async () => {
    const { status } = await deliver(delivering, { name: 'invalid' });
    expect(status).toBe(400);
  });

  // settings.projectId is not read by the handler: a valid and a malformed
  // envelope are answered the same with and without it.
  it('answers the same with and without settings.projectId', async () => {
    const answers = async (settings: { projectId?: string }) => {
      const instance = await createTrigger({
        logger: { handler: () => undefined },
        sources: { pubsub: { code: sourcePubSubPush, config: { settings } } },
        destinations: { vendorX: { code: delivering } },
      });
      try {
        const data = Buffer.from(
          JSON.stringify({ name: 'page view' }),
        ).toString('base64');
        return [
          await instance.trigger()({ message: { messageId: 'm1', data } }),
          await instance.trigger()({ message: { data } }),
        ];
      } finally {
        await instance.flow?.collector.command('shutdown');
      }
    };
    expect(await answers({ projectId: 'my-project-id' })).toEqual(
      await answers({}),
    );
  });
});
