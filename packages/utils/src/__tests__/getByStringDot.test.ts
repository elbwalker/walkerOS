import { getByPath } from '../core';

describe('byPath', () => {
  test('getByPath', () => {
    const obj = {
      foo: 'bar',
      a: { b: 'c' },
      i: [0, 1, { id: 'dynamic' }],
    };
    expect(getByPath(obj, 'foo')).toBe('bar');
    expect(getByPath(obj, 'unknown')).toBe(undefined);
    expect(getByPath(obj, 'a.b')).toBe('c');
    expect(getByPath(obj, 'i.2.id')).toBe('dynamic');
    expect(getByPath(obj, 'i.*.id', 'unknown', 2)).toStrictEqual([
      'unknown',
      'unknown',
      'dynamic',
    ]);
    expect(getByPath(undefined, 'na')).toBe(undefined);
  });
});
