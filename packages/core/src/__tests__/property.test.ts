import { castToProperty, filterValues, isPropertyType } from '..';

describe('property', () => {
  test('isPropertyType', () => {
    expect(isPropertyType('string')).toBeTruthy();
    expect(isPropertyType(1)).toBeTruthy();
    expect(isPropertyType(true)).toBeTruthy();
    expect(isPropertyType(undefined)).toBeTruthy();
    expect(isPropertyType({})).toBeTruthy();
    expect(isPropertyType({ a: '', b: 1, c: true, d: undefined })).toBe(true);
    expect(isPropertyType([])).toBeTruthy();
    expect(isPropertyType([1, '', true, undefined, {}])).toBeTruthy();

    expect(isPropertyType(NaN)).toBeFalsy();
    expect(isPropertyType(Symbol(''))).toBeFalsy();
    expect(isPropertyType(() => {})).toBeFalsy();
    expect(isPropertyType(new Date())).toBeFalsy();
  });

  test('filterValues', () => {
    expect(filterValues('string')).toBe('string');
    expect(filterValues(1)).toBe(1);
    expect(filterValues(true)).toBe(true);
    expect(filterValues(undefined)).toBe(undefined);
    expect(filterValues(null)).toBeNull();
    expect(filterValues(NaN)).toBe(undefined);
    expect(filterValues(Symbol(''))).toBe(undefined);
    expect(filterValues(() => {})).toBe(undefined);
    expect(filterValues(new Date(5))).toBe(5);
    expect(filterValues({})).toStrictEqual({});
    expect(
      filterValues({
        foo: '',
        bar: ['', jest.fn()],
        a: jest.fn(),
        b: new Map(),
        c: NaN,
      }),
    ).toStrictEqual({ foo: '', bar: [''] });
  });

  describe('null is an event value, mapping unchanged', () => {
    test.each<[string, unknown]>([
      ['null', null],
      ['a nested null', { a: null }],
      ['null in an array', [null]],
    ])('isPropertyType accepts %s', (_, value) => {
      expect(isPropertyType(value)).toBe(true);
    });

    test.each<[string, unknown]>([
      ['null', null],
      ['a nested null', { a: null }],
      ['null in an array', [1, null]],
    ])('castToProperty refuses %s', (_, value) => {
      expect(castToProperty(value)).toBeUndefined();
    });
  });

  describe('filterValues hardening', () => {
    test('drops a cyclic back-reference', () => {
      const a: Record<string, unknown> = { x: 1 };
      a.self = a;
      expect(filterValues(a)).toStrictEqual({ x: 1 });
    });

    test('keeps a shared non-cyclic reference twice', () => {
      const s = { v: 1 };
      expect(filterValues({ a: s, b: s })).toStrictEqual({
        a: { v: 1 },
        b: { v: 1 },
      });
    });

    test('keeps a repeated object read before the first cycle twice', () => {
      const s = { v: 1 };
      const a: Record<string, unknown> = { s, t: s };
      a.self = a;
      expect(filterValues(a)).toStrictEqual({ s: { v: 1 }, t: { v: 1 } });
    });

    test('a cyclic push keeps a repeated object once', () => {
      const s = { v: 1 };
      const a: Record<string, unknown> = {};
      a.self = a;
      a.s = s;
      a.t = s;
      expect(filterValues(a)).toStrictEqual({ s: { v: 1 } });
    });

    test('drops a key whose getter throws', () => {
      const source = {
        ok: 1,
        get boom(): number {
          throw new Error('boom');
        },
      };
      expect(filterValues(source)).toStrictEqual({ ok: 1 });
    });

    test('never throws on a proxy whose ownKeys throws', () => {
      const proxy = new Proxy(
        {},
        {
          ownKeys() {
            throw new Error('x');
          },
        },
      );
      expect(filterValues(proxy)).toBeUndefined();
    });

    test('keeps null, turns a Date into its timestamp, drops host objects and functions', () => {
      expect(
        filterValues({
          id: 'x',
          n: null,
          d: new Date(0),
          bad: new Date('x'),
          m: new Map(),
          f: () => 1,
          u: undefined,
        }),
      ).toStrictEqual({ id: 'x', n: null, d: 0 });
    });

    test('keeps an array of values and drops non-values in it', () => {
      expect(filterValues([1, 'a', () => 1, { b: true }])).toStrictEqual([
        1,
        'a',
        { b: true },
      ]);
    });

    test('drops a __proto__ key', () => {
      const input: unknown = JSON.parse('{"__proto__":null,"a":1}');
      const result = filterValues(input);
      expect(result).toStrictEqual({ a: 1 });
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    });

    test('reads each fiber once and keeps the output small, as React fibers link them', () => {
      let reads = 0;
      class Fiber {
        declare readonly id: string;
        return?: Fiber;
        child?: Fiber;
        sibling?: Fiber;
        alternate?: Fiber;
        constructor(id: string) {
          Object.defineProperty(this, 'id', {
            enumerable: true,
            get: () => {
              reads++;
              return id;
            },
          });
        }
      }
      // A tree of depth 3 and fan 2 (15 fibers), linked to its parent,
      // first child and next sibling.
      const tree = (id: string, depth: number, parent?: Fiber): Fiber => {
        const node = new Fiber(id);
        node.return = parent;
        if (depth > 0) {
          const first = tree(`${id}.0`, depth - 1, node);
          first.sibling = tree(`${id}.1`, depth - 1, node);
          node.child = first;
        }
        return node;
      };
      // Each fiber and its twin in the other tree point at each other.
      const link = (a?: Fiber, b?: Fiber): void => {
        if (!a || !b) return;
        a.alternate = b;
        b.alternate = a;
        link(a.child, b.child);
        link(a.sibling, b.sibling);
      };
      const rootA = tree('a', 3);
      link(rootA, tree('b', 3));

      const result = filterValues({ event: 'click', _targetInst: rootA });

      // Each fiber read once; the output about 26 characters a fiber (766),
      // where copies kept at every place give about 188 (5,638).
      expect(reads).toBe(30);
      expect(JSON.stringify(result).length).toBeLessThan(30 * 50);
    });

    test('turns an arguments object into an array', () => {
      const gtagArgs = (function (..._params: unknown[]) {
        return arguments;
      })('consent', 'update', { ad_storage: 'granted' });
      expect(filterValues(gtagArgs)).toStrictEqual([
        'consent',
        'update',
        { ad_storage: 'granted' },
      ]);
    });
  });
});
