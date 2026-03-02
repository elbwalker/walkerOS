import { fetchConfig } from '../config-fetcher.js';

describe('fetchConfig', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws with expiry hint on 401 response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(
      fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      }),
    ).rejects.toThrow(/expired/i);
  });

  it('throws with expiry hint on 403 response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(
      fetchConfig({
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'cfg_1',
      }),
    ).rejects.toThrow(/expired/i);
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
