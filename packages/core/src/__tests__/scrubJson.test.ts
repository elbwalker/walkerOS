import { maskKnownNumbers, scrubJson } from '../scrubJson';
import { scrubSecrets } from '../redactLine';

describe('maskKnownNumbers', () => {
  it('masks numbers that print a digits-only known secret', () => {
    expect(
      maskKnownNumbers(
        { id: 12345678, n: 9123456789, s: 'a12345678b', list: [12345678] },
        ['12345678'],
      ),
    ).toEqual({ id: '***', n: '***', s: 'a12345678b', list: ['***'] });
  });

  it.each([
    ['a negative number', -1234567, '-1234567'],
    ['a decimal', 1234567.5, '1234567.5'],
    ['an exponent form', 1.5e300, '1.5e+300'],
  ])('masks %s whose printed form is a known value', (_label, n, secret) => {
    const masked = maskKnownNumbers({ n, list: [n] }, [secret]);

    expect(masked).toEqual({ n: '***', list: ['***'] });
    // The egress order: mask numbers, serialize, then scrub the text.
    const line = scrubSecrets(JSON.stringify(masked), { known: [secret] });
    expect(JSON.parse(line)).toEqual({ n: '***', list: ['***'] });
  });

  it.each([['12345'], ['tok-123456']])(
    'leaves numbers alone for the known value %s',
    (secret) => {
      const value = { id: 12345678, short: 12345, list: [123456] };
      expect(maskKnownNumbers(value, [secret])).toEqual(value);
    },
  );
});

describe('scrubJson', () => {
  it.each([
    [12345678, '12345678'],
    [-1234567, '-1234567'],
    [1234567.5, '1234567.5'],
  ])('output parses and masks the numeric known secret %s', (value, secret) => {
    const text = scrubJson({ id: value, list: [value] }, { known: [secret] });

    expect(text).toBe('{"id":"***","list":["***"]}');
  });

  it('masks a known string value inside a JSON string', () => {
    expect(
      scrubJson(
        { auth: 'tok-flow-known-3b9f', note: 'x tok-flow-known-3b9f y' },
        { known: ['tok-flow-known-3b9f'] },
      ),
    ).toBe('{"auth":"***","note":"x *** y"}');
  });

  it('masks credential fields by pattern without known values', () => {
    expect(
      scrubJson({ headers: { Authorization: 'Bearer abcdefghijklmnopqrstu' } }),
    ).toBe('{"headers":{"Authorization":"***"}}');
  });

  it('indents with space', () => {
    expect(scrubJson({ a: 1 }, { space: 2 })).toBe('{\n  "a": 1\n}');
  });

  it('prints a value with no JSON form as undefined', () => {
    expect(scrubJson(undefined)).toBe('undefined');
  });
});
