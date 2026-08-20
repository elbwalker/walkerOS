import type { Request } from 'express';
import { buildScope } from '../scope';

// Express Request is a framework interface too large to mock structurally;
// this confined test-double cast is the sanctioned express-harness boundary
// (cf. concurrent-requests.test.ts).
const stubRequest = (overrides: Partial<Request>): Request =>
  ({
    method: 'POST',
    protocol: 'https',
    originalUrl: '/collect?a=1&a=2',
    path: '/collect',
    ip: '203.0.113.7',
    headers: { Host: 'x.example', 'User-Agent': 'UA' },
    body: { name: 'page view' },
    get: (name: string) =>
      name.toLowerCase() === 'host' ? 'x.example' : undefined,
    ...overrides,
  }) as unknown as Request;

describe('buildScope', () => {
  it('maps an express request onto the scope contract', () => {
    expect(buildScope(stubRequest({}))).toEqual({
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

  it('carries the request itself as raw', () => {
    const req = stubRequest({});
    expect(buildScope(req).raw).toBe(req);
  });

  it('omits ip when the platform reports none', () => {
    expect(buildScope(stubRequest({ ip: undefined })).ip).toBeUndefined();
  });

  it('yields an empty url when there is no host', () => {
    const scope = buildScope(
      stubRequest({ headers: {}, get: () => undefined }),
    );
    expect(scope.url).toBe('');
  });

  it('tolerates a request without a get function', () => {
    const req = {
      method: 'POST',
      url: '/collect',
      headers: { 'content-type': 'application/json' },
      body: { name: 'page view' },
    } as unknown as Request;

    expect(buildScope(req)).toEqual({
      method: 'POST',
      url: '',
      path: '/collect',
      query: {},
      headers: { 'content-type': 'application/json' },
      body: { name: 'page view' },
      raw: req,
    });
  });
});
