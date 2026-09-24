import { resolveAppUrl, resolveRunToken } from '../credentials.js';

describe('credentials (environment only)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.WALKEROS_DEPLOY_TOKEN;
    delete process.env.WALKEROS_TOKEN;
    delete process.env.WALKEROS_APP_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers WALKEROS_DEPLOY_TOKEN over WALKEROS_TOKEN', () => {
    process.env.WALKEROS_DEPLOY_TOKEN = 'deploy-token';
    process.env.WALKEROS_TOKEN = 'regular-token';
    expect(resolveRunToken()).toBe('deploy-token');
  });

  it('falls back to WALKEROS_TOKEN', () => {
    process.env.WALKEROS_TOKEN = 'regular-token';
    expect(resolveRunToken()).toBe('regular-token');
  });

  it('treats an empty variable as unset', () => {
    process.env.WALKEROS_DEPLOY_TOKEN = '';
    process.env.WALKEROS_TOKEN = 'regular-token';
    process.env.WALKEROS_APP_URL = '';
    expect(resolveRunToken()).toBe('regular-token');
    expect(resolveAppUrl()).toBe('https://app.walkeros.io');
  });

  it('returns null when no token is in the environment', () => {
    expect(resolveRunToken()).toBeNull();
  });

  it('reads the app URL from WALKEROS_APP_URL, defaulting to the hosted app', () => {
    expect(resolveAppUrl()).toBe('https://app.walkeros.io');
    process.env.WALKEROS_APP_URL = 'https://app.example.com';
    expect(resolveAppUrl()).toBe('https://app.example.com');
  });
});
