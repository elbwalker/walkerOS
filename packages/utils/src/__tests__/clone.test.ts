import type { WalkerOS } from '@walkerOS/types';
import { clone } from '..';

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

  test('Date', () => {
    const org = { date: new Date() };
    const cloned = clone(org);

    expect(cloned.date).not.toBe(org.date);
    expect(cloned.date.getTime()).toBe(org.date.getTime());
  });

  test('RegExp', () => {
    const org = { regex: /test/i };
    const cloned = clone(org);

    expect(cloned.regex).not.toBe(org.regex);
    expect(cloned.regex.source).toBe(org.regex.source);
    expect(cloned.regex.flags).toBe(org.regex.flags);
  });

  test('skip unsupported types', () => {
    const element = document.createElement('div');
    const func = jest.mock;
    const windowRef = window;
    const documentRef = document;

    const org = { element, func, windowRef, documentRef };
    const cloned = clone(org);

    expect(cloned.element).toBe(org.element); // Reference remains the same
    expect(cloned.func).toBe(org.func); // Reference remains the same
    expect(cloned.windowRef).toBe(org.windowRef); // Reference remains the same
    expect(cloned.documentRef).toBe(org.documentRef); // Reference remains the same
  });

  test('handle circular references', () => {
    const obj: { key: string; self?: unknown } = { key: 'value' };
    obj.self = obj; // Create a circular reference

    const cloned = clone(obj);

    expect(cloned).not.toBe(obj); // Cloned object is a new collector
    expect(cloned.key).toBe('value'); // Key is correctly cloned
    expect(cloned.self).toBe(cloned); // Circular reference is preserved in the clone
  });
});
