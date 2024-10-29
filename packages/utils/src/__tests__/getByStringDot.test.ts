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
    expect(getByStringDot(obj, 'i.2.id')).toBe('dynamic');
    expect(getByStringDot(obj, 'i.*.id', 'unknown', 2)).toStrictEqual([
      'unknown',
      'unknown',
      'dynamic',
    ]);
    expect(getByStringDot(undefined, 'na')).toBe(undefined);
  });
});
