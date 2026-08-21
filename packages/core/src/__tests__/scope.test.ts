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

  it('keeps a header named __proto__ as an own key', () => {
    // A real header bag arrives parsed, which does create an own key here,
    // unlike an object literal where __proto__ sets the prototype.
    const bag: unknown = JSON.parse('{"__proto__":"x","a":"b"}');
    const headers = normalizeHeaders(bag);
    expect(Object.keys(headers).sort()).toEqual(['__proto__', 'a']);
  });
});

describe('normalizeQuery', () => {
  it.each([
    ['a=1&b=2', { a: '1', b: '2' }],
    ['?a=1', { a: '1' }],
    ['a=1&a=2', { a: '1,2' }],
    ['', {}],
    ['?', {}],
    // An inherited Object.prototype name must not look like a repeated key.
    ['toString=a', { toString: 'a' }],
    ['constructor=a', { constructor: 'a' }],
    ['a=1&a=2&a=3', { a: '1,2,3' }],
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

  it('decodes multi-byte UTF-8 through base64', () => {
    const encoded = Buffer.from(
      JSON.stringify({ name: 'page view', data: { t: 'Grüße 🎉 東京' } }),
    ).toString('base64');
    expect(normalizeBody(encoded, true)).toEqual({
      name: 'page view',
      data: { t: 'Grüße 🎉 東京' },
    });
  });

  it('returns the input unchanged for malformed base64', () => {
    expect(normalizeBody('!!!not-base64!!!', true)).toBe('!!!not-base64!!!');
  });

  it('returns the decoded text when base64 decodes to non-JSON', () => {
    const encoded = Buffer.from('plain text payload').toString('base64');
    expect(normalizeBody(encoded, true)).toBe('plain text payload');
  });

  it('passes a non-string through untouched', () => {
    const body = { name: 'page view' };
    expect(normalizeBody(body)).toBe(body);
  });

  it.each([[undefined], [null]])('yields the input for %p', (input) => {
    expect(normalizeBody(input)).toBe(input);
  });
});
