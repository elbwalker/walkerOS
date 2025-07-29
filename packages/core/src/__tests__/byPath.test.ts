import { createEvent, getByPath, setByPath } from '..';

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
});
