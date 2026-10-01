import { describeFetchError, fetchWithRetry } from '../fetch-retry';

const URL_WITH_SECRET = 'https://bucket.example/m.json?X-Amz-Signature=secret';

function networkError(code: string): TypeError {
  return new TypeError('fetch failed', { cause: { code } });
}

function timeoutError(): DOMException {
  return new DOMException(
    'The operation was aborted due to timeout',
    'TimeoutError',
  );
}

describe('describeFetchError', () => {
  it.each([
    ['a cause code', networkError('ECONNRESET'), 'fetch failed (ECONNRESET)'],
    [
      'a connect timeout code',
      networkError('UND_ERR_CONNECT_TIMEOUT'),
      'fetch failed (UND_ERR_CONNECT_TIMEOUT)',
    ],
    [
      'a cause name only',
      new TypeError('fetch failed', { cause: { name: 'SocketError' } }),
      'fetch failed (SocketError)',
    ],
    ['no cause', new TypeError('fetch failed'), 'fetch failed'],
    [
      'a plain Error cause',
      new TypeError('fetch failed', { cause: new Error('bad port') }),
      'fetch failed',
    ],
    ['a timeout', timeoutError(), 'timed out after 30s'],
    ['a status', new Response(null, { status: 503 }), 'HTTP 503'],
  ])('names %s', (_label, failure, expected) => {
    expect(describeFetchError(failure, 30_000)).toBe(expected);
  });

  it('never repeats an error message, which may carry the URL', () => {
    const failure = new TypeError(
      `Failed to parse URL from ${URL_WITH_SECRET}`,
    );
    expect(describeFetchError(failure, 30_000)).toBe('fetch failed');
  });
});

describe('fetchWithRetry', () => {
  // The shared jest config restores spies after each test.
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const sleep = jest.fn(async (_ms: number) => {});
  const warn = jest.fn((_message: string) => {});
  const options = {
    label: 'Manifest download',
    timeoutMs: 30_000,
    sleep,
    warn,
  };

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  it.each([
    [
      'a network error',
      networkError('ECONNRESET'),
      'fetch failed (ECONNRESET)',
    ],
    ['a timeout', timeoutError(), 'timed out after 30s'],
  ])('retries %s and returns the later response', async (_l, error, reason) => {
    fetchMock
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(new Response('ok'));

    const response = await fetchWithRetry(URL_WITH_SECRET, {}, options);

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls).toEqual([[1000]]);
    expect(warn.mock.calls).toEqual([
      [`Manifest download attempt 1/3 failed: ${reason}, retrying in 1s`],
    ]);
  });

  it.each([500, 503, 429])('retries HTTP %i', async (status) => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(new Response('ok'));

    const response = await fetchWithRetry(URL_WITH_SECRET, {}, options);

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 403, 404])('never retries HTTP %i', async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));

    await expect(fetchWithRetry(URL_WITH_SECRET, {}, options)).rejects.toThrow(
      `Manifest download failed: HTTP ${status}`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after 3 attempts with 1s then 3s backoff, naming the cause', async () => {
    fetchMock.mockRejectedValue(networkError('ECONNRESET'));

    const failure = fetchWithRetry(URL_WITH_SECRET, {}, options);

    await expect(failure).rejects.toThrow(
      'Manifest download failed after 3 attempts: fetch failed (ECONNRESET)',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [3000]]);
    expect(warn).toHaveBeenCalledTimes(2);
    for (const [message] of warn.mock.calls) {
      expect(message).not.toContain('bucket.example');
    }
  });

  it('gives each attempt its own timeout signal', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('ok'));

    await fetchWithRetry(URL_WITH_SECRET, { method: 'PUT' }, options);

    const [first, second] = fetchMock.mock.calls.map(([, init]) => init);
    expect(first?.method).toBe('PUT');
    expect(first?.signal).toBeInstanceOf(AbortSignal);
    expect(second?.signal).not.toBe(first?.signal);
  });
});
