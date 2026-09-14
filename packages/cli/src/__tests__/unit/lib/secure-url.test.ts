import { requireSecureUrl } from '../../../lib/secure-url.js';

describe('requireSecureUrl', () => {
  it.each([
    'https://app.walkeros.io',
    'https://app.walkeros.io/api/oauth/token',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3000/api/health',
    'http://[::1]:3000',
    'http://LOCALHOST:3000',
  ])('passes %s through unchanged', (url) => {
    expect(requireSecureUrl(url)).toBe(url);
  });

  it.each([
    'http://app.walkeros.io',
    'http://internal.lan:3000/api/oauth/token',
    'http://127.0.0.1.evil.test',
    'http://localhost.evil.test',
  ])('refuses %s', (url) => {
    expect(() => requireSecureUrl(url)).toThrow(url);
  });

  it('names loopback as the exception it allows', () => {
    expect(() => requireSecureUrl('http://internal.lan')).toThrow(
      /localhost \/ 127\.0\.0\.1 \/ \[::1\]/,
    );
  });

  it('leaves a string that is not a URL to fail at the request', () => {
    expect(requireSecureUrl('app.walkeros.io')).toBe('app.walkeros.io');
  });
});
