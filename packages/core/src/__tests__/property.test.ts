import { filterValues, isPropertyType } from '..';

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

    expect(isPropertyType(null)).toBeFalsy();
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
    expect(filterValues(null)).toBe(undefined);
    expect(filterValues(NaN)).toBe(undefined);
    expect(filterValues(Symbol(''))).toBe(undefined);
    expect(filterValues(() => {})).toBe(undefined);
    expect(filterValues(new Date())).toBe(undefined);
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
});
