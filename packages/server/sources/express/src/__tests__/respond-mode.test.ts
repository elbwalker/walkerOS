import { resolveRespondFirst } from '../respond-mode';
import type { RouteMethod } from '../types';

describe('resolveRespondFirst', () => {
  it.each<
    [boolean | Record<string, boolean> | undefined, RouteMethod, boolean]
  >([
    [undefined, 'GET', false],
    [undefined, 'POST', true],
    [true, 'GET', true],
    [true, 'POST', true],
    [false, 'GET', false],
    [false, 'POST', false],
    [{ GET: false, POST: true }, 'GET', false],
    [{ GET: false, POST: true }, 'POST', true],
    [{ GET: true }, 'GET', true],
    [{ GET: true }, 'POST', true],
    [{ POST: false }, 'GET', false],
    [{ POST: false }, 'POST', false],
  ])('resolves %j for %s to %p', (asyncConfig, method, expected) => {
    expect(resolveRespondFirst(asyncConfig, method)).toBe(expected);
  });
});
