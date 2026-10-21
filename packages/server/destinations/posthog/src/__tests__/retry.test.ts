import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationPostHog } from '..';

/**
 * PostHog's endpoint behind the real SDK: each request gets the next answer,
 * a status or no answer at all (the request then ends when the SDK aborts
 * it).
 */
function endpoint(answers: Array<number | 'never'>) {
  let requests = 0;
  jest.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
    const answer = answers[Math.min(requests, answers.length - 1)];
    requests++;
    if (answer === 'never')
      return new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        ),
      );
    return Promise.resolve(new Response('{}', { status: answer }));
  });
  return { requests: () => requests };
}

/** Run fake time until the promise settles; answers how long it took. */
async function settle<T>(
  promise: Promise<T>,
): Promise<{ value: T; ms: number }> {
  const started = Date.now();
  let done = false;
  promise.then(
    () => (done = true),
    () => (done = true),
  );
  for (let step = 0; !done && step < 1000; step++)
    await jest.advanceTimersByTimeAsync(50);
  return { value: await promise, ms: Date.now() - started };
}

async function flowWith(timeout?: number) {
  const { collector } = await startFlow({
    logger: { level: 'ERROR', handler: () => undefined },
    destinations: {
      posthog: {
        code: destinationPostHog,
        config: {
          // Uncompressed, so no zlib work runs outside the fake clock.
          settings: { apiKey: 'k', disableCompression: true },
          batch: undefined,
          timeout,
        },
      },
    },
  });
  return collector;
}

describe('posthog retry within config.timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('delivers once PostHog answers after two 503s, within the timeout', async () => {
    const vendor = endpoint([503, 503, 200]);
    const collector = await flowWith();

    const { value: result, ms } = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );

    expect(result.ok).toBe(true);
    expect(vendor.requests()).toBe(3);
    expect(ms).toBeLessThan(10_000);
  });

  it('fails timeout once when PostHog never answers, before the race', async () => {
    const vendor = endpoint(['never']);
    const collector = await flowWith();

    const { value: result, ms } = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );

    // The SDK's own timeout, not the collector's race: the package's message.
    expect(result.failed?.posthog?.reason).toMatchObject({
      code: 'timeout',
      message: 'PostHog send failed',
    });
    expect(collector.status.destinations.posthog.failed).toBe(1);
    // Three requests of 2.5 s, 1 s apart, end before 10 s.
    expect(vendor.requests()).toBe(3);
    expect(ms).toBeLessThan(10_000);
  });
});
