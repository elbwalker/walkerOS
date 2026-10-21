import { startFlow } from '@walkeros/collector';
import { createEvent } from '@walkeros/core';
import { destinationAmplitude } from '..';

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

describe('amplitude transport within config.timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fails a request Amplitude never answers within the timeout, and the next flush delivers', async () => {
    // Amplitude's endpoint behind the real SDK: no answer until it is up.
    let up = false;
    let requests = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      requests++;
      if (up)
        return Promise.resolve(
          new Response(JSON.stringify({ code: 200, events_ingested: 1 }), {
            status: 200,
          }),
        );
      return new Promise((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        ),
      );
    });

    const { collector } = await startFlow({
      logger: { level: 'ERROR', handler: () => undefined },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: { settings: { apiKey: 'k', logLevel: 0 }, batch: undefined },
        },
      },
    });

    const hung = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );
    // The SDK's own failure (three requests of 2.5 s and its waits), not the
    // collector's race.
    expect(hung.value.failed?.amplitude?.reason).toMatchObject({
      code: 'transport',
      message: 'Amplitude track failed (code 500)',
    });
    expect(requests).toBe(3);
    expect(hung.ms).toBeLessThan(10_000);

    up = true;
    const next = await settle(
      collector.push(createEvent({ name: 'product view' })),
    );
    expect(next.value.ok).toBe(true);
    expect(requests).toBe(4);
  });
});
