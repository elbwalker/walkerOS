import { toSerializable } from '../index.mjs';

describe('toSerializable', () => {
  // Primitives
  it('passes through strings', () => {
    expect(toSerializable('hello')).toBe('hello');
  });

  it('passes through numbers', () => {
    expect(toSerializable(42)).toBe(42);
    expect(toSerializable(0)).toBe(0);
    expect(toSerializable(-1.5)).toBe(-1.5);
  });

  it('passes through booleans', () => {
    expect(toSerializable(true)).toBe(true);
    expect(toSerializable(false)).toBe(false);
  });

  it('passes through null', () => {
    expect(toSerializable(null)).toBeNull();
  });

  it('passes through undefined', () => {
    expect(toSerializable(undefined)).toBeUndefined();
  });

  // Functions
  it('converts functions to $code objects', () => {
    const fn = () => 'test';
    const result = toSerializable(fn);
    expect(result).toEqual({ $code: fn.toString() });
  });

  it('converts named functions to $code objects', () => {
    function myFunc(a, b) {
      return a + b;
    }
    const result = toSerializable(myFunc);
    expect(result).toHaveProperty('$code');
    expect(result.$code).toContain('myFunc');
  });

  // Zod schema instances (objects with _def.typeName starting with 'Zod')
  it('should filter out Zod schema instances', () => {
    const zodSchema = {
      parse: (val) => val,
      safeParse: (val) => ({ success: true, data: val }),
      _def: { typeName: 'ZodObject' },
    };
    expect(toSerializable(zodSchema)).toBeUndefined();
  });

  it('filters out other Zod types', () => {
    const zodString = { parse: () => {}, _def: { typeName: 'ZodString' } };
    expect(toSerializable(zodString)).toBeUndefined();
  });

  it('should NOT filter out non-Zod objects that have a .parse method', () => {
    const csvParser = { parse: (str) => str.split(','), data: [1, 2, 3] };
    const result = toSerializable(csvParser);
    expect(result).toEqual({ data: [1, 2, 3], parse: { $code: csvParser.parse.toString() } });
  });

  // Plain objects
  it('passes through plain objects', () => {
    const obj = { a: 1, b: 'two', c: true };
    expect(toSerializable(obj)).toEqual({ a: 1, b: 'two', c: true });
  });

  it('handles nested objects', () => {
    const obj = { outer: { inner: { value: 42 } } };
    expect(toSerializable(obj)).toEqual({ outer: { inner: { value: 42 } } });
  });

  it('strips Zod instances from nested objects', () => {
    const obj = {
      settings: { type: 'object', properties: {} },
      SettingsSchema: { parse: () => {}, _def: { typeName: 'ZodObject' } },
    };
    const result = toSerializable(obj);
    expect(result).toEqual({
      settings: { type: 'object', properties: {} },
    });
    expect(result).not.toHaveProperty('SettingsSchema');
  });

  it('converts nested functions to $code', () => {
    const noop = () => {};
    const obj = {
      name: 'test',
      handler: noop,
      nested: { callback: noop },
    };
    const result = toSerializable(obj);
    expect(result.name).toBe('test');
    expect(result.handler).toEqual({ $code: noop.toString() });
    expect(result.nested.callback).toEqual({ $code: noop.toString() });
  });

  // Arrays
  it('passes through arrays of primitives', () => {
    expect(toSerializable([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('replaces Zod instances in arrays with undefined (preserves indices)', () => {
    const arr = [
      { name: 'keep' },
      { parse: () => {}, _def: { typeName: 'ZodString' } },
      { name: 'also keep' },
    ];
    const result = toSerializable(arr);
    expect(result).toEqual([{ name: 'keep' }, undefined, { name: 'also keep' }]);
    expect(result).toHaveLength(3);
  });

  it('converts functions inside arrays', () => {
    const fn = () => 'test';
    const result = toSerializable([1, fn, 'three']);
    expect(result).toEqual([1, { $code: fn.toString() }, 'three']);
  });

  it('handles nested arrays', () => {
    const result = toSerializable([[1, 2], [3, 4]]);
    expect(result).toEqual([[1, 2], [3, 4]]);
  });

  // Complex/realistic scenario
  it('handles a realistic dev module export structure', () => {
    const noop = () => Promise.resolve({ ok: true });
    const devExports = {
      env: {
        init: { sendServer: undefined },
        standard: { sendServer: noop },
      },
      events: {
        pageView: { event: 'page view', data: { title: 'Home' } },
      },
    };

    const result = toSerializable(devExports);

    // sendServer undefined should be stripped (key omitted)
    expect(result.env.init).toEqual({});
    // sendServer function should become $code
    expect(result.env.standard.sendServer).toHaveProperty('$code');
    expect(result.env.standard.sendServer.$code).toContain('Promise.resolve');
    // Plain data passes through
    expect(result.events.pageView).toEqual({
      event: 'page view',
      data: { title: 'Home' },
    });
  });

  // JSON roundtrip safety
  it('produces JSON-safe output', () => {
    const fn = (a) => a * 2;
    const input = {
      name: 'test',
      handler: fn,
      zodSchema: { parse: () => {}, _def: { typeName: 'ZodObject' } },
      data: [1, 'two', { nested: true }],
    };

    const result = toSerializable(input);
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('test');
    expect(parsed.handler.$code).toContain('a * 2');
    expect(parsed).not.toHaveProperty('zodSchema');
    expect(parsed.data).toEqual([1, 'two', { nested: true }]);
  });

  // Edge cases
  it('handles empty objects', () => {
    expect(toSerializable({})).toEqual({});
  });

  it('handles empty arrays', () => {
    expect(toSerializable([])).toEqual([]);
  });

  it('does not treat objects with non-function .parse as Zod', () => {
    const obj = { parse: 'not a function', value: 42 };
    expect(toSerializable(obj)).toEqual({ parse: 'not a function', value: 42 });
  });
});
