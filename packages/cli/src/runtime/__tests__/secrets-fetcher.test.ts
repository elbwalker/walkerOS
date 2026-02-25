import { fetchSecrets } from '../secrets-fetcher';

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => mockFetch.mockReset());

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

  it('throws on 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    await expect(fetchSecrets(opts)).rejects.toThrow('500');
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
