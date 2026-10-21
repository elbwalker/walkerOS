import { StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';
import { examples } from '../dev';
import type { Result } from '../examples/trigger';
import { sourceFetch } from '../index';

// The HTTP answer to a push, proven on a real collector: 200 unless a resend
// could still deliver the event (500, a batch 207) or the input is invalid
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

async function post(
  destination: Destination.Instance,
  body: unknown,
): Promise<Result> {
  const instance = await examples.createTrigger({
    logger: { handler: () => undefined },
    sources: { fetch: { code: sourceFetch } },
    destinations: { vendorX: { code: destination } },
  });
  try {
    return await instance.trigger()({
      method: 'POST',
      url: 'https://collect.example/collect',
      body,
    });
  } finally {
    await instance.flow?.collector.command('shutdown');
  }
}

describe('Fetch acknowledgement', () => {
  it('answers 200 for a delivered event', async () => {
    const result = await post(delivering, { name: 'page view' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true });
  });

  it('answers 200 with the success body for a failure a resend cannot fix', async () => {
    const result = await post(failing(deterministic()), { name: 'page view' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      id: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it('answers 500 when a resend could still deliver the event', async () => {
    const result = await post(failing(retryable()), { name: 'page view' });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      success: false,
      error: 'Event was not processed',
    });
  });

  it('answers 400 for invalid input', async () => {
    const result = await post(delivering, { name: 'invalid' });
    expect(result.status).toBe(400);
  });

  it('answers a batch of deterministic failures with 200', async () => {
    const result = await post(failing(deterministic()), {
      batch: [{ name: 'page view' }, { name: 'order complete' }],
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true, processed: 2 });
  });

  it('answers a batch with a retryable failure with 207', async () => {
    const result = await post(failing(retryable()), {
      batch: [{ name: 'page view' }, { name: 'order complete' }],
    });
    expect(result.status).toBe(207);
    expect(result.body).toMatchObject({ success: false, failed: 2 });
    expect(JSON.stringify(result.body)).not.toContain('vendorX');
  });
});
