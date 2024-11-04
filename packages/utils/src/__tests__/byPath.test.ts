import { createEvent, getByPath, setByPath } from '../core';

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

  test('setByPath', () => {
    const event = createEvent();

    expect(setByPath(event, 'timing', 2)).toHaveProperty('timing', 2);
    expect(setByPath(event, 'foo', 'bar')).toHaveProperty('foo', 'bar');
    expect(setByPath(event, 'data.foo', 'bar')).toHaveProperty(
      'data.foo',
      'bar',
    );
    expect(setByPath(event, 'data.array.1', 'bar')).toHaveProperty(
      'data.array.1',
      'bar',
    );
    expect(setByPath(event, 'data.nested', [])).toHaveProperty(
      'data.nested',
      [],
    );
    expect(setByPath(event, 'data', { a: 1 })).toStrictEqual(
      expect.objectContaining({ data: { a: 1 } }),
    );
  });
});
