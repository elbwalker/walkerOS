import { compareOutput } from '../compare';

describe('compareOutput', () => {
  it('reports match for identical values', () => {
    const result = compareOutput(
      [{ type: 'call', path: 'gtag', args: ['event', 'purchase'] }],
      [{ type: 'call', path: 'gtag', args: ['event', 'purchase'] }],
    );
    expect(result.match).toBe(true);
    expect(result.diff).toBeUndefined();
  });

  it('reports mismatch with diff', () => {
    const expected = [
      { type: 'call', path: 'gtag', args: ['event', 'purchase'] },
    ];
    const actual = [
      { type: 'call', path: 'gtag', args: ['event', 'page_view'] },
    ];
    const result = compareOutput(expected, actual);
    expect(result.match).toBe(false);
    expect(result.diff).toContain('Expected:');
    expect(result.diff).toContain('Actual:');
    expect(result.diff).toContain('purchase');
    expect(result.diff).toContain('page_view');
  });

  it('reports match for empty arrays', () => {
    const result = compareOutput([], []);
    expect(result.match).toBe(true);
  });

  it('reports mismatch when expected is empty but actual has calls', () => {
    const result = compareOutput([], [{ type: 'call' }]);
    expect(result.match).toBe(false);
  });

  it('handles nested objects', () => {
    const data = { a: { b: { c: 1 } } };
    const result = compareOutput(data, data);
    expect(result.match).toBe(true);
  });

  it('preserves expected and actual in result', () => {
    const expected = { foo: 'bar' };
    const actual = { foo: 'baz' };
    const result = compareOutput(expected, actual);
    expect(result.expected).toEqual(expected);
    expect(result.actual).toEqual(actual);
  });
});
