import { getByPath } from '@walkeros/core';
import { buildScope } from '../scope';

const request = () =>
  new Request('https://x.example/collect?a=1&a=2', {
    method: 'POST',
    headers: { 'User-Agent': 'UA', 'Content-Type': 'application/json' },
  });

describe('buildScope', () => {
  it('maps a fetch request onto the scope contract', () => {
    const req = request();

    expect(buildScope(req, { name: 'page view' })).toEqual({
      method: 'POST',
      url: 'https://x.example/collect?a=1&a=2',
      path: '/collect',
      query: { a: '1,2' },
      headers: { 'user-agent': 'UA', 'content-type': 'application/json' },
      body: { name: 'page view' },
      raw: req,
    });
  });

  // The assertion that would have caught the original defect: a Headers
  // instance tags as [object Headers], which getByPath refuses to descend, so
  // every `key` mapping on this source resolved undefined.
  it.each([
    ['headers.user-agent', 'UA'],
    ['method', 'POST'],
    ['path', '/collect'],
    ['query.a', '1,2'],
  ])('resolves %s by path, which the raw Request cannot', (path, expected) => {
    const req = request();

    expect(getByPath(buildScope(req, undefined), path)).toBe(expected);
    expect(getByPath(req, path)).toBeUndefined();
  });

  it('reports no ip, because the platform supplies none', () => {
    expect(buildScope(request(), undefined).ip).toBeUndefined();
  });

  it('carries the Request itself as raw, so fn mappings can still reach it', () => {
    const req = request();
    expect(buildScope(req, undefined).raw).toBe(req);
  });
});
