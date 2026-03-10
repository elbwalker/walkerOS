const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock('node:crypto', () => ({
  createSign: jest.fn(() => ({
    update: jest.fn(),
    sign: jest.fn(() => 'mock-signature'),
  })),
}));

import { createTokenProvider } from '../auth';

describe('createTokenProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('ADC mode (no credentials)', () => {
    it('should fetch token from metadata server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'adc-token', expires_in: 3600 }),
      });

      const getToken = createTokenProvider();
      const token = await getToken();

      expect(token).toBe('adc-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } },
      );
    });

    it('should cache token on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'cached-token', expires_in: 3600 }),
      });

      const getToken = createTokenProvider();
      await getToken();
      const token = await getToken();

      expect(token).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on metadata server error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const getToken = createTokenProvider();
      await expect(getToken()).rejects.toThrow('Metadata server error: 404');
    });
  });

  describe('SA mode (with credentials)', () => {
    const creds = {
      client_email: 'test@project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
    };

    it('should exchange JWT for access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'sa-token', expires_in: 3600 }),
      });

      const getToken = createTokenProvider(creds);
      const token = await getToken();

      expect(token).toBe('sa-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
    });

    it('should cache SA token on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ access_token: 'sa-cached', expires_in: 3600 }),
      });

      const getToken = createTokenProvider(creds);
      await getToken();
      const token = await getToken();

      expect(token).toBe('sa-cached');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on token exchange error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const getToken = createTokenProvider(creds);
      await expect(getToken()).rejects.toThrow('Token exchange error: 401');
    });
  });
});
