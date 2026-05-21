import { createEvent, getByPath, setByPath } from '..';
import { deleteByPath } from '../byPath';

describe('byPath', () => {
  test('getByPath', () => {
    const obj = {
      foo: 'bar',
      isFalse: false,
      a: { b: 'c', isFalse: false },
      i: [0, 1, { id: 'dynamic' }],
    };
    expect(getByPath(obj, 'foo')).toBe('bar');
    expect(getByPath(obj, 'unknown')).toBe(undefined);
    expect(getByPath(obj, 'isFalse')).toBe(false);
    expect(getByPath(obj, 'a.b')).toBe('c');
    expect(getByPath(obj, 'a.isFalse')).toBe(false);
    expect(getByPath(obj, 'i.2.id')).toBe('dynamic');
    expect(getByPath(obj, 'i.*.id', 'unknown')).toStrictEqual([
      'unknown',
      'unknown',
      'dynamic',
    ]);
    expect(getByPath(undefined, 'na')).toBe(undefined);

    // Falsy intermediate values: should return defaultValue when path continues beyond
    expect(getByPath({ a: { b: 0 } }, 'a.b.c', 'default')).toBe('default');
    expect(getByPath({ a: { b: false } }, 'a.b.c', 'default')).toBe('default');
    expect(getByPath({ a: { b: '' } }, 'a.b.c', 'default')).toBe('default');
    expect(getByPath({ a: { b: null } }, 'a.b.c', 'default')).toBe('default');

    // Falsy leaf values: should still return the falsy value itself
    expect(getByPath({ a: { b: 0 } }, 'a.b')).toBe(0);
    expect(getByPath({ a: { b: '' } }, 'a.b')).toBe('');
  });

  test('setByPath', () => {
    const event = createEvent();

    expect(setByPath(event, 'timing', 2)).toHaveProperty('timing', 2);
    expect(setByPath(event, 'data.string', 'updated')).toHaveProperty(
      'data.string',
      'updated',
    );
    expect(setByPath(event, 'data.array.1', 'bar')).toHaveProperty(
      'data.array.1',
      'bar',
    );
    expect(setByPath(event, 'nested', [])).toHaveProperty('nested', []);
    expect(setByPath(event, 'data', { a: 1 })).toStrictEqual(
      expect.objectContaining({ data: { a: 1 } }),
    );
  });

  test('setByPath immutability', () => {
    const originalEvent = createEvent();
    const originalData = originalEvent.data;

    const modifiedEvent = setByPath(originalEvent, 'data.newField', 'newValue');

    // Original event should not be modified
    expect(originalEvent.data).toBe(originalData);
    expect(originalEvent.data).not.toHaveProperty('newField');

    // Modified event should have the new field
    expect(modifiedEvent.data).toHaveProperty('newField', 'newValue');
    expect(modifiedEvent).not.toBe(originalEvent);
  });

  describe('deleteByPath', () => {
    it('removes a top-level key, returning a new object', () => {
      const input = { a: 1, b: 2 };
      expect(deleteByPath(input, 'b')).toEqual({ a: 1 });
      expect(input).toEqual({ a: 1, b: 2 });
    });
    it('removes a nested key via dotted path', () => {
      expect(
        deleteByPath({ data: { id: 1, currency: 'EUR' } }, 'data.currency'),
      ).toEqual({ data: { id: 1 } });
    });
    it('is a no-op when the path does not exist', () => {
      expect(deleteByPath({ a: 1 }, 'b.c')).toEqual({ a: 1 });
    });
    it('returns the value unchanged when it is not an object', () => {
      expect(deleteByPath<string>('scalar', 'a')).toBe('scalar');
    });
  });

  describe('getByPath cross-realm', () => {
    test('traverses null-prototype objects (portable)', () => {
      const nullProto: { foo?: { bar: number } } = Object.create(null);
      nullProto.foo = { bar: 42 };

      // Sanity: proves the old instanceof Object guard fails for this shape.
      expect(nullProto instanceof Object).toBe(false);

      expect(getByPath(nullProto, 'foo.bar')).toBe(42);
    });

    test('traverses objects from a different V8 realm (vm)', () => {
      let vm: typeof import('node:vm');
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        vm = require('node:vm');
      } catch {
        // node:vm unavailable in this jest project; nothing to verify here.
        return;
      }

      const crossRealm = vm.runInNewContext(
        '({ headers: { "x-test": "hit" } })',
      );

      // Sanity: cross-realm objects fail the old instanceof Object check.
      expect(crossRealm instanceof Object).toBe(false);

      expect(getByPath(crossRealm, 'headers.x-test')).toBe('hit');
    });

    test('does not traverse exotic builtins (Date, Map)', () => {
      // These were never functional traversal targets; assert non-traversal
      // so the new guard's narrowing stays intentional.
      expect(getByPath(new Date(), 'toISOString')).toBe(undefined);
      expect(getByPath(new Map([['k', 'v']]), 'size')).toBe(undefined);
    });
  });
});
