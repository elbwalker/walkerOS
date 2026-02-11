import { registerRuntime } from '../../runtime/register.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('registerRuntime', () => {
  const config = {
    appUrl: 'https://app.example.com',
    deployToken: 'tok_abc123',
    projectId: 'proj_abc',
    flowId: 'flow_123',
    bundlePath: 'projects/proj_abc/flows/flow_123/abc123def456.mjs',
  };

  it('should call register endpoint and return bundle URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bundleUrl: 'https://s3.fr-par.scw.cloud/bucket/bundle.mjs?signed=yes',
      }),
    });

    const result = await registerRuntime(config);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.example.com/api/projects/proj_abc/runtimes/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_abc123',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result.bundleUrl).toBe(
      'https://s3.fr-par.scw.cloud/bucket/bundle.mjs?signed=yes',
    );
  });

  it('should throw on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(registerRuntime(config)).rejects.toThrow(
      'Registration failed: 401 Unauthorized',
    );
  });

  it('should throw on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(registerRuntime(config)).rejects.toThrow('fetch failed');
  });
});
