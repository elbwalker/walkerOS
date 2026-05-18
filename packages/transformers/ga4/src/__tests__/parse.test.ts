import {
  parseBody,
  parseConsent,
  parseItem,
  parseQuery,
  parseRequest,
} from '../parse';

describe('parseQuery', () => {
  it('extracts simple params', () => {
    expect(parseQuery('https://x/g/collect?v=2&tid=G-XXX&cid=111.222')).toEqual(
      { v: '2', tid: 'G-XXX', cid: '111.222' },
    );
  });

  it('decodes url-encoded values', () => {
    const out = parseQuery(
      'https://x/g/collect?dl=https%3A%2F%2Fshop.example%2Fp%2F1&dt=My%20Page',
    );
    expect(out.dl).toBe('https://shop.example/p/1');
    expect(out.dt).toBe('My Page');
  });

  it('handles missing query string', () => {
    expect(parseQuery('https://x/g/collect')).toEqual({});
  });

  it('preserves last value when keys repeat', () => {
    expect(parseQuery('https://x/g/collect?en=a&en=b').en).toBe('b');
  });

  it('returns empty for bare-question-mark URL', () => {
    expect(parseQuery('https://x/g/collect?')).toEqual({});
  });
});

describe('parseBody', () => {
  it('returns single-line body as one event', () => {
    expect(parseBody('en=page_view&_et=1234')).toEqual([
      { en: 'page_view', _et: '1234' },
    ]);
  });

  it('splits LF-separated multi-line body into N events', () => {
    const body = 'en=page_view&_et=10\nen=scroll&epn.percent_scrolled=90';
    const out = parseBody(body);
    expect(out).toHaveLength(2);
    expect(out[1].en).toBe('scroll');
    expect(out[1]['epn.percent_scrolled']).toBe('90');
  });

  it('handles CRLF separator', () => {
    expect(parseBody('en=a\r\nen=b')).toHaveLength(2);
  });

  it('skips empty lines and trims whitespace', () => {
    expect(parseBody('en=a\n\n  en=b  \n')).toHaveLength(2);
  });

  it('returns empty array for empty body', () => {
    expect(parseBody('')).toEqual([]);
  });

  it('handles trailing newline', () => {
    expect(parseBody('en=page_view\n')).toHaveLength(1);
  });
});

describe('parseItem (standard prefixes)', () => {
  it('parses id, name, brand, price, quantity', () => {
    const it = parseItem('idSKU1~nmRed Shirt~brAcme~pr29.95~qt2');
    expect(it).toMatchObject({
      id: 'SKU1',
      name: 'Red Shirt',
      brand: 'Acme',
      price: 29.95,
      quantity: 2,
    });
  });

  it('does NOT double-decode (URLSearchParams already decoded)', () => {
    // After URLSearchParams decoded, "%20" became literal space; "%25" became literal "%".
    // The parser receives the already-decoded subfield contents.
    const it = parseItem('nm100% Cotton');
    expect(it.name).toBe('100% Cotton');
  });

  it('parses categories c2..c5', () => {
    const it = parseItem('caTop~c2Mid~c3Low~c4Deep~c5Bottom');
    expect(it).toMatchObject({
      category: 'Top',
      category2: 'Mid',
      category3: 'Low',
      category4: 'Deep',
      category5: 'Bottom',
    });
  });

  it('NaN-guards numeric coercion', () => {
    const it = parseItem('idA~prabc~qtxyz');
    expect(it.price).toBeUndefined();
    expect(it.quantity).toBeUndefined();
  });

  it('initializes custom={} when no k/v present', () => {
    expect(parseItem('idA').custom).toEqual({});
  });

  it('ignores unknown short prefixes', () => {
    const it = parseItem('idA~zzGarbage');
    expect(it.id).toBe('A');
    // Unknown prefix `zz` must not appear in custom or as any known field.
    expect(it.custom).toEqual({});
    expect(Object.keys(it)).toEqual(['custom', 'id']);
  });
});

describe('parseItem (promotion prefixes)', () => {
  it('parses affiliation, creativeName, creativeSlot, promotionId, promotionName', () => {
    const it = parseItem('idA~afStore~cnHero~csTop~piPROMO-1~pnSummer Sale');
    expect(it).toMatchObject({
      id: 'A',
      affiliation: 'Store',
      creativeName: 'Hero',
      creativeSlot: 'Top',
      promotionId: 'PROMO-1',
      promotionName: 'Summer Sale',
    });
  });
});

describe('parseItem (custom k/v)', () => {
  it('captures single-digit k0/v0 pairs', () => {
    const it = parseItem('idA~k0color~v0red~k1size~v1L');
    expect(it.custom).toEqual({ color: 'red', size: 'L' });
  });

  it('captures multi-digit k10/v10 pairs', () => {
    const it = parseItem('idA~k10color~v10red~k11size~v11L');
    expect(it.custom).toEqual({ color: 'red', size: 'L' });
  });

  it('drops unbalanced k without matching v', () => {
    const it = parseItem('idA~k0color~v1red');
    expect(it.custom).toEqual({});
  });

  it('handles k<N> values containing arbitrary characters', () => {
    const it = parseItem('idA~k0note~v0has spaces and ?chars');
    // GA4 escapes literal ~ in values to %7E before sending, so URLSearchParams
    // gives us a single segment. The split('~') here would still split on a
    // literal ~ in the segment, so we use a value without literal tildes.
    expect(it.custom.note).toContain('has spaces');
  });
});

describe('parseConsent', () => {
  it('returns empty consent when gcs missing', () => {
    expect(parseConsent({})).toEqual({});
  });
  it('grants both for G111', () => {
    expect(parseConsent({ gcs: 'G111' })).toEqual({
      analytics: true,
      marketing: true,
    });
  });
  it('denies both for G100', () => {
    expect(parseConsent({ gcs: 'G100' })).toEqual({
      analytics: false,
      marketing: false,
    });
  });
  it('analytics-only for G101', () => {
    expect(parseConsent({ gcs: 'G101' })).toEqual({
      analytics: true,
      marketing: false,
    });
  });
  it('marketing-only for G110', () => {
    expect(parseConsent({ gcs: 'G110' })).toEqual({
      analytics: false,
      marketing: true,
    });
  });
  it('ignores malformed gcs', () => {
    expect(parseConsent({ gcs: 'invalid' })).toEqual({});
    expect(parseConsent({ gcs: 'G12X' })).toEqual({});
  });
});

describe('parseRequest', () => {
  it('GET hit with all data in URL', () => {
    const out = parseRequest({
      url: 'https://x/g/collect?v=2&tid=G-XXX&cid=111.222&en=page_view&ep.author=alex&dl=https%3A%2F%2Fshop',
    });
    expect(out.hit).toMatchObject({
      v: '2',
      tid: 'G-XXX',
      cid: '111.222',
      dl: 'https://shop',
    });
    expect(out.events).toHaveLength(1);
    expect(out.events[0]).toMatchObject({
      en: 'page_view',
      params: { ep: { author: 'alex' }, epn: {}, up: {}, upn: {} },
      items: [],
    });
  });

  it('POST batch nests ep/epn keys per event', () => {
    const out = parseRequest({
      url: 'https://x/g/collect?v=2&tid=G-XXX&cid=111.222',
      body: 'en=purchase&ep.transaction_id=T-1&epn.value=29.95\nen=scroll&epn.percent_scrolled=90',
    });
    expect(out.events).toHaveLength(2);
    expect(out.events[0]).toMatchObject({
      en: 'purchase',
      params: { ep: { transaction_id: 'T-1' }, epn: { value: 29.95 } },
    });
    expect(out.events[1]).toMatchObject({
      en: 'scroll',
      params: { epn: { percent_scrolled: 90 } },
    });
  });

  it('parses pr<N> items into items array, sorted by index', () => {
    const out = parseRequest({
      url: 'https://x/g/collect?v=2&tid=G-XXX&en=view_item',
      body: 'en=view_item&pr2=idB~pr10&pr1=idA~pr5',
    });
    expect(out.events[0].items).toHaveLength(2);
    expect(out.events[0].items[0].id).toBe('A');
    expect(out.events[0].items[1].id).toBe('B');
  });

  it('handles GET request with no body', () => {
    const out = parseRequest({
      url: 'https://x/g/collect?v=2&tid=G-XXX&en=page_view&dl=https%3A%2F%2Fx',
    });
    expect(out.events).toHaveLength(1);
    expect(out.events[0].en).toBe('page_view');
  });

  it('drops body lines with no en', () => {
    const out = parseRequest({
      url: 'https://x/g/collect?v=2&tid=G-XXX',
      body: 'foo=bar\nen=page_view',
    });
    expect(out.events).toHaveLength(1);
    expect(out.events[0].en).toBe('page_view');
  });
});
