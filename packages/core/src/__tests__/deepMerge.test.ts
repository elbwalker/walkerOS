import { deepMerge } from '..';

describe('deepMerge', () => {
  test('nested object recursion (3+ levels deep)', () => {
    const target = { a: { b: { c: 1, d: 2 } } };
    const source = { a: { b: { c: 42 } } };
    expect(deepMerge(target, source)).toStrictEqual({
      a: { b: { c: 42, d: 2 } },
    });
  });

  test('arrays are replaced, not concatenated', () => {
    const target = { tags: [1, 2, 3] };
    const source = { tags: [4, 5] };
    expect(deepMerge(target, source)).toStrictEqual({ tags: [4, 5] });
  });

  test('functions are replaced, not recursed into', () => {
    const fn1 = () => 'a';
    const fn2 = () => 'b';
    const target = { handler: fn1 };
    const source = { handler: fn2 };
    deepMerge(target, source);
    expect(target.handler).toBe(fn2);
  });

  test('undefined source values are skipped', () => {
    const target = { a: 1, b: 2 };
    const source = { a: undefined, b: 3 };
    expect(deepMerge(target, source)).toStrictEqual({ a: 1, b: 3 });
  });

  test('null source values overwrite target', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { a: null, b: null };
    expect(deepMerge(target, source)).toStrictEqual({ a: null, b: null });
  });

  test('empty source object is no-op', () => {
    const target = { a: 1, b: { c: 2 } };
    const original = { a: 1, b: { c: 2 } };
    expect(deepMerge(target, {})).toStrictEqual(original);
  });

  test('non-object source returns target unchanged', () => {
    const target = { a: 1 };
    expect(deepMerge(target, 'string' as never)).toStrictEqual({ a: 1 });
    expect(deepMerge(target, null as never)).toStrictEqual({ a: 1 });
    expect(deepMerge(target, 42 as never)).toStrictEqual({ a: 1 });
  });

  test('returns the mutated target reference', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = deepMerge(target, source);
    expect(result).toBe(target);
    expect(target).toStrictEqual({ a: 1, b: 2 });
  });

  test('ignores a __proto__ key', () => {
    const result = deepMerge(
      { a: 1 },
      JSON.parse('{"__proto__":{"polluted":true},"b":2}'),
    );
    expect(result).toEqual({ a: 1, b: 2 });
    expect(Reflect.get({}, 'polluted')).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  test('keeps constructor and prototype as own data', () => {
    deepMerge(
      {},
      JSON.parse('{"constructor":{"prototype":{"polluted":true}}}'),
    );
    expect(Reflect.get({}, 'polluted')).toBeUndefined();
  });
});
