import { fetchConfig } from '../../runtime/config-fetcher.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const opts = {
  appUrl: 'https://app.example.com',
  token: 'sk-walkeros-abc',
  projectId: 'proj_123',
  flowId: 'flow_456',
};

describe('fetchConfig', () => {
  it('calls GET with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: { version: 1 } }),
      headers: new Headers([['etag', '"abc123"']]),
    });
    await fetchConfig(opts);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.example.com/api/projects/proj_123/flows/flow_456',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-walkeros-abc',
        }),
      }),
    );
  });

  it('returns changed: true with content on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: { version: 1, flows: {} } }),
      headers: new Headers([['etag', '"abc123"']]),
    });
    const result = await fetchConfig(opts);
    expect(result.changed).toBe(true);
    if (result.changed) {
      expect(result.content).toEqual({ version: 1, flows: {} });
      expect(result.etag).toBe('"abc123"');
    }
  });

  it('returns changed: false on 304', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 304 });
    const result = await fetchConfig({ ...opts, lastEtag: '"abc123"' });
    expect(result.changed).toBe(false);
  });

  it('sends If-None-Match when lastEtag provided', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 304 });
    await fetchConfig({ ...opts, lastEtag: '"abc123"' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-None-Match': '"abc123"',
        }),
      }),
    );
  });

  it('throws on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    await expect(fetchConfig(opts)).rejects.toThrow('Config fetch failed: 401');
  });

  it('does not send If-None-Match when no lastEtag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: { version: 1 } }),
      headers: new Headers([['etag', '"def456"']]),
    });
    await fetchConfig(opts);
    const callHeaders = mockFetch.mock.calls[0][1].headers;
    expect(callHeaders['If-None-Match']).toBeUndefined();
  });
});
