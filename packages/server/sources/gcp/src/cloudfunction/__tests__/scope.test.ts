import { buildScope } from '../scope';
import type { Request } from '../types';

const stubRequest = (overrides: Partial<Request> = {}): Request => ({
  method: 'POST',
  originalUrl: '/collect?a=1&a=2',
  path: '/collect',
  protocol: 'https',
  ip: '203.0.113.7',
  headers: { Host: 'x.example', 'User-Agent': 'UA' },
  body: { name: 'page view' },
  get: (name: string) =>
    name.toLowerCase() === 'host' ? 'x.example' : undefined,
  ...overrides,
});

describe('buildScope', () => {
  it('maps a cloud function request onto the scope contract', () => {
    expect(buildScope(stubRequest())).toEqual({
      method: 'POST',
      url: 'https://x.example/collect?a=1&a=2',
      path: '/collect',
      query: { a: '1,2' },
      headers: { host: 'x.example', 'user-agent': 'UA' },
      body: { name: 'page view' },
      ip: '203.0.113.7',
      raw: expect.anything(),
    });
  });

  it('parses a sendBeacon text/plain body into an object', () => {
    const scope = buildScope(
      stubRequest({
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ name: 'page view' }),
      }),
    );

    expect(scope.body).toEqual({ name: 'page view' });
  });

  it('leaves an unparseable body as the raw string', () => {
    expect(buildScope(stubRequest({ body: 'not json' })).body).toBe('not json');
  });

  it('carries the request itself as raw', () => {
    const req = stubRequest();
    expect(buildScope(req).raw).toBe(req);
  });
});
