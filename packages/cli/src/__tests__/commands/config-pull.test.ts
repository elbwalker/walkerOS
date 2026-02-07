import { configPull } from '../../commands/config/index.js';

describe('configPull', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_TOKEN;
    delete process.env.WALKEROS_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('throws when WALKEROS_TOKEN not set', async () => {
    await expect(configPull({ configId: 'cfg_abc123' })).rejects.toThrow(
      'WALKEROS_TOKEN not set',
    );
  });

  it('fetches config with correct auth header and URL', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test123';
    process.env.WALKEROS_APP_URL = 'http://localhost:3000';

    const mockConfig = { id: 'cfg_abc', name: 'Test', content: {} };
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockConfig), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await configPull({ configId: 'cfg_abc123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/configs/cfg_abc123',
      { headers: { Authorization: 'Bearer sk-walkeros-test123' } },
    );
    expect(result).toEqual(mockConfig);
  });

  it('handles 401 with clear error message', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-expired';

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
        }),
      );

    await expect(configPull({ configId: 'cfg_abc' })).rejects.toThrow(
      'Authentication failed',
    );
  });

  it('handles 404 with clear error message', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-valid';

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );

    await expect(configPull({ configId: 'cfg_nonexistent' })).rejects.toThrow(
      'Config not found: cfg_nonexistent',
    );
  });

  it('uses default base URL when WALKEROS_APP_URL not set', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-default';

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'cfg_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await configPull({ configId: 'cfg_123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.walkeros.io/api/configs/cfg_123',
      expect.any(Object),
    );
  });

  it('rejects WALKEROS_APP_URL with http:// protocol (non-localhost)', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
    process.env.WALKEROS_APP_URL = 'http://evil.com';

    await expect(configPull({ configId: 'cfg_123' })).rejects.toThrow('HTTPS');
  });

  it('allows WALKEROS_APP_URL with http://localhost for development', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
    process.env.WALKEROS_APP_URL = 'http://localhost:3000';

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'cfg_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await configPull({ configId: 'cfg_123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/configs/cfg_123',
      expect.any(Object),
    );
  });

  it('allows WALKEROS_APP_URL with http://127.0.0.1 for development', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
    process.env.WALKEROS_APP_URL = 'http://127.0.0.1:3000';

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'cfg_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await configPull({ configId: 'cfg_123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/configs/cfg_123',
      expect.any(Object),
    );
  });

  it('rejects malformed WALKEROS_APP_URL', async () => {
    process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
    process.env.WALKEROS_APP_URL = 'not-a-url';

    await expect(configPull({ configId: 'cfg_123' })).rejects.toThrow(
      'Invalid WALKEROS_APP_URL',
    );
  });
});
