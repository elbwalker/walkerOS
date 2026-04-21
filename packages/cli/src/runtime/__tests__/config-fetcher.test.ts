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

  it('throws generic error on other HTTP failures', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      }),
    ).rejects.toThrow(/500/);
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
