import { fetchWithRetry } from '../fetch-retry.js';

/**
 * Build the kind of error AbortSignal.timeout() produces when an attempt
 * exceeds its per-attempt budget. Node throws a DOMException named
 * 'TimeoutError'; modelling it directly keeps the test free of casts.
 */
function timeoutError(): DOMException {
  return new DOMException('The operation timed out', 'TimeoutError');
}

/**
 * Build a network-layer error carrying a libuv-style `code`, matching how
 * undici surfaces connection failures (e.g. a rejected fetch with
 * cause.code === 'ECONNRESET').
 */
function networkError(code: string): Error & { code: string } {
  return Object.assign(new Error(`connect ${code}`), { code });
}

describe('fetchWithRetry', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  /**
   * Run fetchWithRetry to completion while draining every backoff timer the
   * retry loop schedules. runAllTimersAsync flushes the setTimeout-based sleeps
   * so the promise settles without real waits.
   */
  async function runWithTimers(promise: Promise<Response>): Promise<Response> {
    // Keep a settled handle so the rejection is observed (no unhandled
    // rejection) while runAllTimersAsync drains the backoff sleeps.
    const settled = promise.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await jest.runAllTimersAsync();
    const result = await settled;
    if (result.ok) return result.value;
    throw result.error;
  }

  it('retries a timeout then succeeds (2 calls)', async () => {
    mockFetch
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries a 503 then succeeds (2 calls)', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries a 429 then succeeds (2 calls)', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries a network error then succeeds (2 calls)', async () => {
    mockFetch
      .mockRejectedValueOnce(networkError('ECONNRESET'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a 404 (1 call, returns the 404 Response)', async () => {
    mockFetch.mockResolvedValueOnce(new Response('missing', { status: 404 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a 200 (1 call, returns the Response)', async () => {
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle'),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting attempts on persistent timeout (3 calls)', async () => {
    mockFetch
      .mockRejectedValueOnce(timeoutError())
      .mockRejectedValueOnce(timeoutError())
      .mockRejectedValueOnce(timeoutError());

    await expect(
      runWithTimers(fetchWithRetry('https://example.com/bundle')),
    ).rejects.toThrow(/after 3 attempts/);

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('names the last cause in the exhaustion error message', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }));

    await expect(
      runWithTimers(fetchWithRetry('https://example.com/bundle')),
    ).rejects.toThrow(/503/);
  });

  it('honors a custom attempts count', async () => {
    mockFetch
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const response = await runWithTimers(
      fetchWithRetry('https://example.com/bundle', { attempts: 2 }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('passes init and a per-attempt timeout signal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await runWithTimers(
      fetchWithRetry('https://example.com/bundle', {
        init: { headers: { 'x-test': '1' } },
      }),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/bundle',
      expect.objectContaining({
        headers: { 'x-test': '1' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('stops retrying once the total budget is exceeded', async () => {
    // maxTotalMs allows exactly one attempt: attempt 1 fails, the loop sleeps
    // the (clamped) backoff which consumes the rest of the budget, then the
    // next iteration sees too little left to start a second attempt.
    mockFetch.mockRejectedValue(timeoutError());

    await expect(
      runWithTimers(
        fetchWithRetry('https://example.com/bundle', {
          attempts: 5,
          maxTotalMs: 2_000,
        }),
      ),
    ).rejects.toThrow(/after 1 attempt/);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not start an attempt when budget is below the floor', async () => {
    // Budget under MIN_ATTEMPT_BUDGET_MS: a clamped sub-second attempt could not
    // connect, so the loop must not call fetch at all.
    mockFetch.mockRejectedValue(timeoutError());

    await expect(
      runWithTimers(
        fetchWithRetry('https://example.com/bundle', {
          attempts: 5,
          maxTotalMs: 500,
        }),
      ),
    ).rejects.toThrow(/after 0 attempts/);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('clamps each attempt timeout to the remaining budget', async () => {
    // perAttemptTimeoutMs (30s) far exceeds maxTotalMs (5s): the first attempt's
    // timeout must be clamped to the remaining 5s so a single attempt cannot
    // overrun the total budget.
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    try {
      mockFetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await runWithTimers(
        fetchWithRetry('https://example.com/bundle', {
          perAttemptTimeoutMs: 30_000,
          maxTotalMs: 5_000,
        }),
      );

      expect(timeoutSpy).toHaveBeenCalledTimes(1);
      expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it('clamps later attempts as the budget shrinks', async () => {
    // After a failed attempt and ~2000ms backoff, the next attempt's timeout
    // must be clamped to the budget remaining (~3000ms of the 5000ms cap), not
    // the full perAttemptTimeoutMs.
    const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
    try {
      mockFetch
        .mockRejectedValueOnce(timeoutError())
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));

      await runWithTimers(
        fetchWithRetry('https://example.com/bundle', {
          perAttemptTimeoutMs: 30_000,
          maxTotalMs: 5_000,
        }),
      );

      // Attempt 1 clamped to the full 5000ms budget; attempt 2 clamped to what
      // remains after the ~2000ms (±20%) backoff has elapsed.
      const calls = timeoutSpy.mock.calls.map((call) => call[0]);
      expect(calls).toHaveLength(2);
      expect(calls[0]).toBe(5_000);
      expect(calls[1]).toBeLessThan(5_000);
      expect(calls[1]).toBeGreaterThan(0);
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
