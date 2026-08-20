import { toEventList, isBatchBody } from '../envelope';

describe('toEventList', () => {
  it.each([
    ['one event object', { name: 'page view' }, [{ name: 'page view' }]],
    [
      'a batch envelope',
      { batch: [{ name: 'a' }, { name: 'b' }] },
      [{ name: 'a' }, { name: 'b' }],
    ],
    [
      'a bare array',
      [{ name: 'a' }, { name: 'b' }],
      [{ name: 'a' }, { name: 'b' }],
    ],
    ['an unparseable string body', 'not json', [{}]],
    ['no body', undefined, [{}]],
    ['a null body', null, [{}]],
  ])('%s', (_, body, expected) => {
    expect(toEventList(body)).toEqual(expected);
  });

  it('forwards a non-event object verbatim so a before chain can rewrite it', () => {
    expect(toEventList({ vendor: 'payload' })).toEqual([{ vendor: 'payload' }]);
  });

  it('treats a non-array batch key as an ordinary event field', () => {
    expect(toEventList({ name: 'page view', batch: 'x' })).toEqual([
      { name: 'page view', batch: 'x' },
    ]);
  });

  it('yields an empty list for an empty batch', () => {
    expect(toEventList({ batch: [] })).toEqual([]);
  });
});

describe('isBatchBody', () => {
  it.each([
    ['a batch envelope', { batch: [{ name: 'a' }, { name: 'b' }] }, true],
    ['a single-element batch envelope', { batch: [{ name: 'a' }] }, true],
    ['an empty batch envelope', { batch: [] }, true],
    ['a bare array', [{ name: 'a' }, { name: 'b' }], true],
    ['a bare single-element array', [{ name: 'a' }], true],
    ['one event object', { name: 'page view' }, false],
    ['a non-array batch key', { name: 'page view', batch: 'x' }, false],
    ['an unparseable string body', 'not json', false],
    ['no body', undefined, false],
  ])('%s -> %p', (_, body, expected) => {
    expect(isBatchBody(body)).toBe(expected);
  });
});
