import {
  getToken,
  getAuthHeaders,
  authenticatedFetch,
} from '../../core/auth.js';

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('getToken', () => {
    it('returns undefined when WALKEROS_TOKEN is not set', () => {
      expect(getToken()).toBeUndefined();
    });

    it('returns token when WALKEROS_TOKEN is set', () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-abc123';
      expect(getToken()).toBe('sk-walkeros-abc123');
    });

    it('returns undefined for empty string', () => {
      process.env.WALKEROS_TOKEN = '';
      expect(getToken()).toBeUndefined();
    });
  });

  describe('getAuthHeaders', () => {
    it('returns empty object when no token', () => {
      expect(getAuthHeaders()).toEqual({});
    });

    it('returns Authorization header when token is set', () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-test';
      expect(getAuthHeaders()).toEqual({
        Authorization: 'Bearer sk-walkeros-test',
      });
    });
  });

  describe('authenticatedFetch', () => {
    it('adds auth header to requests when token is set', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-fetch-test';
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await authenticatedFetch('https://example.com/api');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
        headers: { Authorization: 'Bearer sk-walkeros-fetch-test' },
      });
    });

    it('calls fetch without auth header when no token', async () => {
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await authenticatedFetch('https://example.com/api');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
        headers: {},
      });
    });

    it('merges custom headers with auth header', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-merge';
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await authenticatedFetch('https://example.com/api', {
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
        headers: {
          Authorization: 'Bearer sk-walkeros-merge',
          'Content-Type': 'application/json',
        },
      });
    });

    it('passes through other fetch options', async () => {
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await authenticatedFetch('https://example.com/api', {
        method: 'POST',
        body: '{"test":true}',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
        method: 'POST',
        body: '{"test":true}',
        headers: {},
      });
    });

    it('auth header cannot be overridden by caller', async () => {
      process.env.WALKEROS_TOKEN = 'sk-walkeros-real';
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response('ok', { status: 200 }));

      await authenticatedFetch('https://example.com/api', {
        headers: { Authorization: 'Bearer sk-walkeros-evil' },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api', {
        headers: {
          Authorization: 'Bearer sk-walkeros-real',
        },
      });
    });
  });
});
