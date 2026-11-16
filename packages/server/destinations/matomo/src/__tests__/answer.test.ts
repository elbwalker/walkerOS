import { bulkAnswerOf } from '../answer';

describe('bulkAnswerOf', () => {
  it.each<[string, unknown, unknown]>([
    [
      'a success answer',
      { status: 'success', tracked: 1, invalid: 0 },
      { tracked: 1, invalid: 0 },
    ],
    [
      'an answer with an invalid request',
      { status: 'error', tracked: 0, invalid: 1 },
      { tracked: 0, invalid: 1 },
    ],
    ['an empty body (204)', '', 'unconfirmed'],
    ['no body', undefined, 'unconfirmed'],
    ['the tracker GIF (QueuedTracking)', 'GIF89a', 'unconfirmed'],
    ['an HTML page', '<html>', undefined],
    ['counts that are not numbers', { tracked: '1' }, undefined],
  ])('reads %s', (_, data, expected) => {
    expect(bulkAnswerOf(data)).toEqual(expected);
  });
});
