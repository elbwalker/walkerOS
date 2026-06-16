import { fetchConfig } from '../config-fetcher.js';
import { RunnerAuthError } from '../runner-auth-error.js';

interface MockResponseInit {
  status: number;
  statusText?: string;
  body?: unknown;
}

function makeResponse({ status, statusText = '', body }: MockResponseInit) {
  const bodyJson = async () => body;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(),
    json: bodyJson,
    clone() {
      return makeResponse({ status, statusText, body });
    },
  };
}

describe('fetchConfig', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /**
   * Drive a fetchConfig call to completion while flushing the retry helper's
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

  it('retries a transient 503 then succeeds', async () => {
    jest.useFakeTimers();
    try {
      globalThis.fetch = jest
        .fn()
        .mockResolvedValueOnce(makeResponse({ status: 503 }))
        .mockResolvedValueOnce(
          makeResponse({
            status: 200,
            body: { config: { version: 3 } },
          }),
        );

      const result = await runWithTimers(
        fetchConfig({
          appUrl: 'http://localhost:3000',
          token: 'sk-walkeros-test',
          projectId: 'proj_1',
          flowId: 'cfg_1',
        }),
      );

      expect(result.changed).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does NOT retry a 401 (single call) and throws RunnerAuthError', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        makeResponse({ status: 401, statusText: 'Unauthorized' }),
      );
    globalThis.fetch = fetchMock;

    await expect(
      fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      }),
    ).rejects.toBeInstanceOf(RunnerAuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws RunnerAuthError(unauthorised) on 401 response', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        makeResponse({ status: 401, statusText: 'Unauthorized' }),
      );

    await expect(
      fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      }),
    ).rejects.toBeInstanceOf(RunnerAuthError);
  });

  it('throws RunnerAuthError(flow) on 403 FORBIDDEN_FLOW', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      makeResponse({
        status: 403,
        statusText: 'Forbidden',
        body: { error: { code: 'FORBIDDEN_FLOW', message: 'wrong flow' } },
      }),
    );

    try {
      await fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      });
      throw new Error('expected RunnerAuthError');
    } catch (err) {
      expect(err).toBeInstanceOf(RunnerAuthError);
      expect((err as RunnerAuthError).reason).toBe('flow');
      expect((err as RunnerAuthError).code).toBe('FORBIDDEN_FLOW');
    }
  });

  it('retries a persistent 500 to exhaustion then throws (3 calls)', async () => {
    jest.useFakeTimers();
    try {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      globalThis.fetch = fetchMock;

      await expect(
        runWithTimers(
          fetchConfig({
            appUrl: 'http://localhost:3000',
            token: 'sk-walkeros-test',
            projectId: 'proj_1',
            flowId: 'cfg_1',
          }),
        ),
      ).rejects.toThrow(/500/);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns unchanged on 304', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 304,
    });

    const result = await fetchConfig({
      appUrl: 'http://localhost:3000',
      token: 'sk-walkeros-test',
      projectId: 'proj_1',
      flowId: 'cfg_1',
      lastEtag: '"abc"',
    });

    expect(result).toEqual({ changed: false });
  });
});
