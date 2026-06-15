import { fetchSecrets } from '../secrets-fetcher';
import { RunnerAuthError } from '../runner-auth-error.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => mockFetch.mockReset());

/**
 * Drive a fetchSecrets call to completion while flushing the retry helper's
 * backoff sleeps so a transient-then-success sequence settles without real
 * waits. Mirrors the fetch-retry test's fake-timer drain.
 */
async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await jest.runAllTimersAsync();
  const result = await settled;
  if (result.ok) return result.value;
  throw result.error;
}

describe('fetchSecrets', () => {
  const opts = {
    appUrl: 'https://app.test',
    token: 'tok_123',
    projectId: 'proj_abc',
    flowId: 'flow_xyz',
  };

  it('fetches and returns name→value map', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ values: { API_KEY: 'secret123' } }),
    });
    const result = await fetchSecrets(opts);
    expect(result).toEqual({ API_KEY: 'secret123' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.test/api/projects/proj_abc/flows/flow_xyz/secrets/values',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_123',
        }),
      }),
    );
  });

  it('returns empty object on 200 with empty values', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ values: {} }),
    });
    const result = await fetchSecrets(opts);
    expect(result).toEqual({});
  });

  it('throws on 404 (hard fail)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    await expect(fetchSecrets(opts)).rejects.toThrow('404');
  });

  it('retries a persistent 500 to exhaustion then throws (3 calls)', async () => {
    jest.useFakeTimers();
    try {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      await expect(runWithTimers(fetchSecrets(opts))).rejects.toThrow('500');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies a timeout signal to the fetch (no longer unbounded)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ values: {} }),
    });
    await fetchSecrets(opts);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('retries a transient 503 then succeeds', async () => {
    jest.useFakeTimers();
    try {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ values: { API_KEY: 'secret123' } }),
        });
      const result = await runWithTimers(fetchSecrets(opts));
      expect(result).toEqual({ API_KEY: 'secret123' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does NOT retry a 403 (single call) and throws RunnerAuthError', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
      clone() {
        return {
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({
            error: { code: 'FORBIDDEN_SCOPE', message: 'no scope' },
          }),
        };
      },
    });
    await expect(fetchSecrets(opts)).rejects.toBeInstanceOf(RunnerAuthError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('URL-encodes path parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ values: {} }),
    });
    await fetchSecrets({ ...opts, projectId: 'proj/special' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('proj%2Fspecial'),
      expect.anything(),
    );
  });
});
