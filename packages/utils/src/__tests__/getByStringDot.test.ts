import { getByStringDot } from '../core';

describe('getByStringDot', () => {
  test('getByStringDot', () => {
    const obj = {
      foo: 'bar',
      a: { b: 'c' },
      i: [0, 1, { id: 'dynamic' }],
    };
    expect(getByStringDot(obj, 'foo')).toBe('bar');
    expect(getByStringDot(obj, 'unknown')).toBe(undefined);
    expect(getByStringDot(obj, 'a.b')).toBe('c');
    expect(getByStringDot(obj, 'i.*.id', 2)).toBe('dynamic');
    expect(getByStringDot(undefined, 'na')).toBe(undefined);
  });
});
