import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationSegment } from '..';

/**
 * Segment's endpoint behind the real SDK: each request gets the next answer,
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
      segment: {
        code: destinationSegment,
        config: { settings: { writeKey: 'w' }, batch: undefined, timeout },
      },
    },
  });
  return collector;
}

describe('segment retry within config.timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('delivers once Segment answers after two 503s, within the timeout', async () => {
    const vendor = endpoint([503, 503, 200]);
    // Three attempts with the SDK's backoff need more than the 10 s default.
    const collector = await flowWith(30_000);

    const { value: result, ms } = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );

    expect(result.ok).toBe(true);
    expect(vendor.requests()).toBe(3);
    expect(ms).toBeLessThan(30_000);
  });

  it('fails timeout once when Segment never answers, before the race', async () => {
    const vendor = endpoint(['never']);
    const collector = await flowWith();

    const { value: result, ms } = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );

    // The SDK's own timeout, not the collector's race: the package's message.
    expect(result.failed?.segment?.reason).toMatchObject({
      code: 'timeout',
      message: 'Segment track failed',
    });
    expect(collector.status.destinations.segment.failed).toBe(1);
    // Two requests of 2.5 s and the backoff between them end before 10 s.
    expect(vendor.requests()).toBe(2);
    expect(ms).toBeLessThan(10_000);
  });
});
