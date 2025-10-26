import {
  formatValueForDisplay,
  getConfiguredProperties,
} from '../value-display-formatter';

describe('formatValueForDisplay', () => {
  it('formats strings with quotes', () => {
    expect(formatValueForDisplay('data.id')).toBe('"data.id"');
  });

  it('formats numbers as strings', () => {
    expect(formatValueForDisplay(42)).toBe('42');
  });

  it('formats booleans as strings', () => {
    expect(formatValueForDisplay(true)).toBe('true');
    expect(formatValueForDisplay(false)).toBe('false');
  });

  it('formats empty arrays', () => {
    expect(formatValueForDisplay([])).toBe('[]');
  });

  it('formats arrays with string first item', () => {
    expect(formatValueForDisplay(['nested', 'item'])).toBe('"nested"');
  });

  it('formats arrays with number first item', () => {
    expect(formatValueForDisplay([42, 100])).toBe('42');
  });

  it('formats arrays with complex first item as count', () => {
    expect(formatValueForDisplay([{ a: 1 }, { b: 2 }])).toBe('[2]');
  });

  it('formats empty objects', () => {
    expect(formatValueForDisplay({})).toBe('{}');
  });

  it('formats objects with keys', () => {
    expect(formatValueForDisplay({ a: 1, b: 2 })).toBe('{ a, b }');
  });
});

describe('getConfiguredProperties', () => {
  it('handles simple string values', () => {
    const result = getConfiguredProperties('data.id');
    expect(result).toEqual([{ prop: '', value: '"data.id"', isLong: false }]);
  });

  it('handles simple string values that are long', () => {
    const longString = 'a'.repeat(25);
    const result = getConfiguredProperties(longString);
    expect(result).toEqual([
      { prop: '', value: `"${longString}"`, isLong: true },
    ]);
  });

  it('handles ValueConfig with only key property', () => {
    const result = getConfiguredProperties({ key: 'data.productId' });
    expect(result).toEqual([
      { prop: '', value: '"data.productId"', isLong: false },
    ]);
  });

  it('handles ValueConfig with multiple properties', () => {
    const result = getConfiguredProperties({
      key: 'data.id',
      consent: { marketing: true },
      validate: '(value) => value !== null',
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      prop: 'key',
      value: '"data.id"',
      isLong: false,
    });
    expect(result[1].prop).toBe('consent');
    expect(result[2].prop).toBe('validate');
  });

  it('handles all ValueConfig property types', () => {
    const result = getConfiguredProperties({
      fn: '(value) => value.data',
      key: 'data.id',
      value: 'USD',
      map: { id: 'data.id' },
      loop: ['nested', 'item'],
      set: ['a', 'b'],
      consent: { marketing: true },
      condition: '(value) => true',
      validate: '(value) => value',
    });

    expect(result).toHaveLength(9);
    const props = result.map((r) => r.prop);
    expect(props).toEqual([
      'fn',
      'key',
      'value',
      'map',
      'loop',
      'set',
      'consent',
      'condition',
      'validate',
    ]);
  });

  it('handles empty objects', () => {
    const result = getConfiguredProperties({});
    expect(result).toEqual([]);
  });

  it('handles null and undefined', () => {
    expect(getConfiguredProperties(null)).toEqual([]);
    expect(getConfiguredProperties(undefined)).toEqual([]);
  });

  it('handles ValueConfig with loop array showing first item', () => {
    const result = getConfiguredProperties({
      loop: ['nested', { map: {} }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      prop: 'loop',
      value: '"nested"',
      isLong: false,
    });
  });
});
