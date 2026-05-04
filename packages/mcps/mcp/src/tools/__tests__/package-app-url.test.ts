import { getPackageBaseUrl } from '../package.js';

describe('getPackageBaseUrl', () => {
  const original = {
    walkeros: process.env.WALKEROS_APP_URL,
    legacy: process.env.APP_URL,
  };

  afterEach(() => {
    if (original.walkeros !== undefined) {
      process.env.WALKEROS_APP_URL = original.walkeros;
    } else {
      delete process.env.WALKEROS_APP_URL;
    }
    if (original.legacy !== undefined) {
      process.env.APP_URL = original.legacy;
    } else {
      delete process.env.APP_URL;
    }
  });

  it('returns WALKEROS_APP_URL when set', () => {
    delete process.env.APP_URL;
    process.env.WALKEROS_APP_URL = 'https://test.app.walkeros.io';
    expect(getPackageBaseUrl()).toBe('https://test.app.walkeros.io');
  });

  it('returns undefined when WALKEROS_APP_URL unset (no APP_URL fallback)', () => {
    delete process.env.WALKEROS_APP_URL;
    process.env.APP_URL = 'https://legacy.example.com';
    expect(getPackageBaseUrl()).toBeUndefined();
  });

  it('returns undefined when WALKEROS_APP_URL is empty string', () => {
    delete process.env.APP_URL;
    process.env.WALKEROS_APP_URL = '';
    expect(getPackageBaseUrl()).toBeUndefined();
  });

  it('prefers WALKEROS_APP_URL even when both are set', () => {
    process.env.WALKEROS_APP_URL = 'https://new.example.com';
    process.env.APP_URL = 'https://legacy.example.com';
    expect(getPackageBaseUrl()).toBe('https://new.example.com');
  });
});
