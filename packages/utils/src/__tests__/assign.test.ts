import { assign } from '..';
import type { WalkerOS } from '@elbwalker/types';

describe('Utils assign', () => {
  let obj1: WalkerOS.AnyObject;
  let obj2: WalkerOS.AnyObject;

  beforeEach(() => {
    obj1 = { a: 1, b: [1, 2] };
    obj2 = { b: [2, 3], c: 3 };
  });

  test('regular', () => {
    expect(assign(obj1, obj2)).toStrictEqual({ a: 1, b: [1, 2, 3], c: 3 });
  });

  test('merge false', () => {
    expect(assign(obj1, obj2, { merge: false })).toStrictEqual({
      a: 1,
      b: [2, 3],
      c: 3,
    });
  });

  test('shallow false', () => {
    const objReturn = assign(obj1, obj2, { shallow: false });

    const result = {
      a: 1,
      b: [1, 2, 3],
      c: 3,
    };

    expect(obj1).toStrictEqual(result);
    expect(objReturn).toStrictEqual(result);
  });

  test('extend false', () => {
    expect(assign(obj1, obj2, { extend: false })).toStrictEqual({
      a: 1,
      b: [1, 2, 3],
      // no c
    });
  });
});
