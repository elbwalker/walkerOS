import {
  apiFetch,
  publicFetch,
  deployFetch,
  mergeAuthHeaders,
} from '../../../core/http.js';

jest.mock('../../../lib/config-file.js', () => ({
  resolveAppUrl: jest.fn().mockReturnValue('https://stage.app.walkeros.io'),
  resolveToken: jest
    .fn()
    .mockReturnValue({ token: 'test-token', source: 'env' }),
  resolveDeployToken: jest.fn().mockReturnValue(null),
}));

import { resolveDeployToken } from '../../../lib/config-file.js';

describe('core/http', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('apiFetch', () => {
    it('prepends base URL and adds auth header', async () => {
      await apiFetch('/api/feedback', { method: 'POST' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://stage.app.walkeros.io/api/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('preserves existing headers', async () => {
      await apiFetch('/api/test', {
        headers: { 'X-Custom': 'value' },
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Custom']).toBe('value');
      expect(headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('publicFetch', () => {
    it('prepends base URL without auth header', async () => {
      await publicFetch('/api/auth/device/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://stage.app.walkeros.io/api/auth/device/code',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
  });

  describe('deployFetch', () => {
    it('uses deploy token when available', async () => {
      (resolveDeployToken as jest.Mock).mockReturnValueOnce('deploy-tok');

      await deployFetch('/api/projects/p1/runners/heartbeat', {
        method: 'POST',
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer deploy-tok');
    });

    it('falls back to user token when no deploy token', async () => {
      await deployFetch('/api/projects/p1/runners/heartbeat', {
        method: 'POST',
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('mergeAuthHeaders', () => {
    it('merges bearer token into existing headers', () => {
      const result = mergeAuthHeaders('my-token', {
        'Content-Type': 'application/json',
      });
      expect(result).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-token',
      });
    });

    it('returns headers without auth when token is null', () => {
      const result = mergeAuthHeaders(null, {
        'Content-Type': 'application/json',
      });
      expect(result).toEqual({ 'Content-Type': 'application/json' });
    });

    it('returns empty object when no token and no headers', () => {
      const result = mergeAuthHeaders(null);
      expect(result).toEqual({});
    });
  });
});
