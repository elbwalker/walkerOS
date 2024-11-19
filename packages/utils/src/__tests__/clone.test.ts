import type { WalkerOS } from '@elbwalker/types';
import { clone } from '../core';

describe('clone', () => {
  test('mutation prevention', () => {
    const obj: WalkerOS.AnyObject = {};
    const arr: unknown[] = [];
    const org = { obj, arr };

    // Clone the object
    const clonedObj = clone(org);

    // At first, the values should be the same
    expect(clonedObj).toEqual(org);

    // Attempt to mutate the original values
    clonedObj.obj['foo'] = true;
    clonedObj.arr.push('foo');
    expect(clonedObj.obj).toEqual({ foo: true });
    expect(clonedObj.arr).toEqual(['foo']);
    expect(org.obj).toEqual({});
    expect(org.arr).toEqual([]);

    // Attempt to mutate the cloned values
    obj.bar = true;
    arr.push('bar');
    expect(clonedObj.obj).toEqual({ foo: true });
    expect(clonedObj.arr).toEqual(['foo']);

    expect(org.obj).toEqual({ bar: true });
    expect(org.arr).toEqual(['bar']);
  });
});
