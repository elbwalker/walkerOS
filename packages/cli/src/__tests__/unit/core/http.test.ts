import {
  apiFetch,
  publicFetch,
  deployFetch,
  mergeAuthHeaders,
} from '../../../core/http.js';

jest.mock('../../../lib/config-file.js', () => ({
  resolveAppUrl: jest.fn().mockReturnValue('https://stage.app.walkeros.io'),
  resolveDeployToken: jest.fn().mockReturnValue(null),
}));

jest.mock('../../../core/auth.js', () => ({
  resolveAccessToken: jest.fn().mockResolvedValue('test-token'),
}));

import { resolveDeployToken } from '../../../lib/config-file.js';
import { resolveAccessToken } from '../../../core/auth.js';

const mockResolveAccessToken = jest.mocked(resolveAccessToken);

describe('core/http', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    mockResolveAccessToken.mockResolvedValue('test-token');
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

    it('sends no auth header when no token resolves', async () => {
      mockResolveAccessToken.mockResolvedValue(null);

      await apiFetch('/api/test');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('awaits the resolved token rather than embedding the promise', async () => {
      // A missed `await` would stringify a Promise into the header, which is a
      // silent auth failure rather than a type error once spread into an object.
      await apiFetch('/api/test');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(String(headers['Authorization'])).not.toContain('Promise');
    });
  });

  describe('publicFetch', () => {
    it('prepends base URL without auth header', async () => {
      await publicFetch('/api/oauth/device_authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://stage.app.walkeros.io/api/oauth/device_authorization',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      expect(mockResolveAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('deployFetch', () => {
    it('uses deploy token when available', async () => {
      jest.mocked(resolveDeployToken).mockReturnValueOnce('deploy-tok');

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

    it('throws when neither a deploy token nor a session resolves', async () => {
      mockResolveAccessToken.mockResolvedValue(null);

      await expect(
        deployFetch('/api/projects/p1/runners/heartbeat'),
      ).rejects.toThrow('No authentication token available');
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
