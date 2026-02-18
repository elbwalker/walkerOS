import { matchPath } from '../utils';

describe('matchPath', () => {
  it('should match exact paths', () => {
    expect(matchPath('/collect', '/collect')).toBe(true);
    expect(matchPath('/events', '/events')).toBe(true);
  });

  it('should reject non-matching exact paths', () => {
    expect(matchPath('/collect', '/events')).toBe(false);
    expect(matchPath('/collect/foo', '/collect')).toBe(false);
  });

  it('should match wildcard paths', () => {
    expect(matchPath('/webhooks/stripe', '/webhooks/*')).toBe(true);
    expect(matchPath('/webhooks/github', '/webhooks/*')).toBe(true);
    expect(matchPath('/api/v1/events', '/api/*')).toBe(true);
  });

  it('should match wildcard prefix without trailing segment', () => {
    expect(matchPath('/webhooks', '/webhooks/*')).toBe(true);
  });

  it('should reject non-matching wildcard paths', () => {
    expect(matchPath('/other/stripe', '/webhooks/*')).toBe(false);
    expect(matchPath('/webhook', '/webhooks/*')).toBe(false);
  });
});
