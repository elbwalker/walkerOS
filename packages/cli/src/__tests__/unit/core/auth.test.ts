import {
  getToken,
  getAuthHeaders,
  resolveRunToken,
} from '../../../core/auth.js';

// Isolate from real ~/.config/walkeros/config.json
jest.mock('../../../lib/config-file.js', () => ({
  resolveToken: () => {
    const token = process.env.WALKEROS_TOKEN;
    if (!token) return null;
    return { token, source: 'env' as const };
  },
  resolveDeployToken: () => process.env.WALKEROS_DEPLOY_TOKEN ?? null,
  resolveAppUrl: () =>
    process.env.WALKEROS_APP_URL || 'https://app.walkeros.io',
}));

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_TOKEN;
    delete process.env.WALKEROS_DEPLOY_TOKEN;
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

  describe('resolveRunToken', () => {
    it('returns WALKEROS_DEPLOY_TOKEN when set', () => {
      process.env.WALKEROS_DEPLOY_TOKEN = 'deploy-token';
      process.env.WALKEROS_TOKEN = 'regular-token';
      expect(resolveRunToken()).toBe('deploy-token');
    });

    it('falls back to WALKEROS_TOKEN when no deploy token', () => {
      process.env.WALKEROS_TOKEN = 'regular-token';
      expect(resolveRunToken()).toBe('regular-token');
    });

    it('returns null when no token available', () => {
      expect(resolveRunToken()).toBeNull();
    });
  });
});
