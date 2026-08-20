import { normalizeHeaders, normalizeQuery, normalizeBody } from '../scope';

describe('normalizeHeaders', () => {
  it('reads a Headers instance', () => {
    expect(normalizeHeaders(new Headers({ 'User-Agent': 'UA' }))).toEqual({
      'user-agent': 'UA',
    });
  });

  it('lowercases keys of a plain bag', () => {
    expect(normalizeHeaders({ 'Content-Type': 'application/json' })).toEqual({
      'content-type': 'application/json',
    });
  });

  it('joins repeated values with a comma and a space', () => {
    expect(
      normalizeHeaders({ 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] }),
    ).toEqual({
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
  });

  it('skips undefined values', () => {
    expect(normalizeHeaders({ present: 'yes', missing: undefined })).toEqual({
      present: 'yes',
    });
  });

  it.each([[undefined], [null], ['string'], [42], [[]]])(
    'yields {} for %p',
    (input) => {
      expect(normalizeHeaders(input)).toEqual({});
    },
  );

  it('yields {} for a non-empty array', () => {
    expect(normalizeHeaders(['a', 'b'])).toEqual({});
  });
});

describe('normalizeQuery', () => {
  it.each([
    ['a=1&b=2', { a: '1', b: '2' }],
    ['?a=1', { a: '1' }],
    ['a=1&a=2', { a: '1,2' }],
    ['', {}],
    ['?', {}],
  ])('%s -> %p', (input, expected) => {
    expect(normalizeQuery(input)).toEqual(expected);
  });
});

describe('normalizeBody', () => {
  it('parses a JSON string', () => {
    expect(normalizeBody('{"name":"page view"}')).toEqual({
      name: 'page view',
    });
  });

  it('returns a non-JSON string unchanged', () => {
    expect(normalizeBody('not json')).toBe('not json');
  });

  it('decodes base64 before parsing', () => {
    const encoded = Buffer.from('{"name":"page view"}').toString('base64');
    expect(normalizeBody(encoded, true)).toEqual({ name: 'page view' });
  });

  it('passes a non-string through untouched', () => {
    const body = { name: 'page view' };
    expect(normalizeBody(body)).toBe(body);
  });

  it.each([[undefined], [null]])('yields the input for %p', (input) => {
    expect(normalizeBody(input)).toBe(input);
  });
});
