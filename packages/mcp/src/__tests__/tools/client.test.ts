describe('api/client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = jest.fn() as jest.Mock;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('getApiConfig', () => {
    it('should throw when WALKEROS_TOKEN is not set', async () => {
      delete process.env.WALKEROS_TOKEN;
      const { getApiConfig } = await import('../../api/client.js');
      expect(() => getApiConfig()).toThrow('WALKEROS_TOKEN not set');
    });

    it('should return config with defaults', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      process.env.WALKEROS_PROJECT_ID = 'proj_abc';
      const { getApiConfig } = await import('../../api/client.js');
      const config = getApiConfig();
      expect(config.token).toBe('sk-walkeros-test');
      expect(config.projectId).toBe('proj_abc');
      expect(config.baseUrl).toBe('https://app.walkeros.io');
    });

    it('should use custom WALKEROS_APP_URL', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      process.env.WALKEROS_APP_URL = 'http://localhost:3000';
      const { getApiConfig } = await import('../../api/client.js');
      expect(getApiConfig().baseUrl).toBe('http://localhost:3000');
    });
  });

  describe('requireProjectId', () => {
    it('should throw when WALKEROS_PROJECT_ID is not set', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      delete process.env.WALKEROS_PROJECT_ID;
      const { requireProjectId } = await import('../../api/client.js');
      expect(() => requireProjectId()).toThrow('WALKEROS_PROJECT_ID not set');
    });

    it('should return projectId when set', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      process.env.WALKEROS_PROJECT_ID = 'proj_abc';
      const { requireProjectId } = await import('../../api/client.js');
      expect(requireProjectId()).toBe('proj_abc');
    });
  });

  describe('apiRequest', () => {
    it('should send authenticated request', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });
      global.fetch = mockFetch as any;

      const { apiRequest } = await import('../../api/client.js');
      await apiRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-walkeros-test',
          }),
        }),
      );
    });

    it('should return parsed JSON on success', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ userId: 'user_1' }),
      }) as any;
      const { apiRequest } = await import('../../api/client.js');
      const result = await apiRequest('/api/test');
      expect(result).toEqual({ userId: 'user_1' });
    });

    it('should return success object on 204', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }) as any;
      const { apiRequest } = await import('../../api/client.js');
      const result = await apiRequest('/api/test', { method: 'DELETE' });
      expect(result).toEqual({ success: true });
    });

    it('should throw on API error with message', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
          }),
      }) as any;
      const { apiRequest } = await import('../../api/client.js');
      await expect(apiRequest('/api/test')).rejects.toThrow('Invalid token');
    });

    it('should throw a clear message on timeout', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      const timeoutError = new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      );
      global.fetch = jest.fn().mockRejectedValue(timeoutError) as any;
      const { apiRequest } = await import('../../api/client.js');
      await expect(apiRequest('/api/test', undefined, 5000)).rejects.toThrow(
        'Request timed out after 5s',
      );
    });

    it('should pass signal to fetch', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });
      global.fetch = mockFetch as any;

      const { apiRequest } = await import('../../api/client.js');
      await apiRequest('/api/test');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.signal).toBeDefined();
    });
  });
});
