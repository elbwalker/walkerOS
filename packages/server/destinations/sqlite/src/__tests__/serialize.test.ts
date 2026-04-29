import type { WalkerOS } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { CANONICAL_COLUMNS, eventToRow } from '../serialize';

describe('sqlite serialize', () => {
  it('reads page_url from source.url and referrer_url from source.referrer', () => {
    const event: WalkerOS.Event = getEvent('page view', {
      timestamp: 1700000200,
      id: 'evt-x',
      data: { title: 'Docs' },
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/docs',
        referrer: 'https://example.com/',
      },
    });

    const row = eventToRow(event);
    const pageUrlIdx = CANONICAL_COLUMNS.indexOf('page_url');
    const referrerUrlIdx = CANONICAL_COLUMNS.indexOf('referrer_url');

    expect(row[pageUrlIdx]).toBe('https://example.com/docs');
    expect(row[referrerUrlIdx]).toBe('https://example.com/');
  });
});
