import {
  formatCall,
  formatElb,
  formatRule,
  literal,
  tokenizeCode,
} from '../parts/format';

describe('literal', () => {
  it('prints JavaScript literals', () => {
    expect(literal({ value: 420, items: [{ item_id: 'ers' }], ok: true })).toBe(
      "{ value: 420, items: [{ item_id: 'ers' }], ok: true }",
    );
    expect(literal("it's")).toBe("'it\\'s'");
    expect(literal({})).toBe('{}');
    expect(literal(null)).toBe('null');
  });
});

describe('formatRule', () => {
  it('names the rule and elides data and settings bodies', () => {
    expect(
      formatRule('product', 'view', { name: 'view_item', data: { map: {} } }),
    ).toBe('"product": { "view": { "name": "view_item", "data": {…} } }');
    expect(
      formatRule('order', 'complete', {
        silent: true,
        settings: { revenue: { loop: [] } },
      }),
    ).toBe(
      '"order": { "complete": { "silent": true, "settings": { "revenue": {…} } } }',
    );
  });
});

describe('formatCall', () => {
  it('expands the first object argument, one key per line', () => {
    expect(
      formatCall([
        'gtag',
        'event',
        'view_item',
        { currency: 'EUR', value: 420, send_to: 'G-XXXXXXXXXX' },
      ]),
    ).toEqual([
      "gtag('event', 'view_item', {",
      "  currency: 'EUR',",
      '  value: 420,',
      "  send_to: 'G-XXXXXXXXXX',",
      '})',
    ]);
  });

  it('keeps later arguments on the closing line', () => {
    expect(
      formatCall(['fbq', 'track', 'Lead', { value: 2500 }, { eventID: '…' }]),
    ).toEqual([
      "fbq('track', 'Lead', {",
      '  value: 2500,',
      "}, { eventID: '…' })",
    ]);
  });

  it("prints Amplitude revenue as the Revenue object's setters", () => {
    expect(
      formatCall(['amplitude.revenue', { productId: 'ers', price: 420 }]),
    ).toEqual([
      'amplitude.revenue(new Revenue()',
      "  .setProductId('ers')",
      '  .setPrice(420))',
    ]);
  });

  it('prints a call without an object on one line', () => {
    expect(formatCall(['ttq.page'])).toEqual(['ttq.page()']);
  });
});

describe('formatElb', () => {
  it('prints a flat event as elb(name, data)', () => {
    expect(
      formatElb({
        entity: 'product',
        action: 'view',
        data: { id: 'ers', price: 420, currency: 'EUR' },
      }),
    ).toBe("elb('product view', { id: 'ers', price: 420, currency: 'EUR' })");
  });

  it('prints an event with nested entities as an object, nested abbreviated', () => {
    expect(
      formatElb({
        entity: 'order',
        action: 'complete',
        data: { id: '0rd3r1d' },
        nested: [{ entity: 'product' }],
      }),
    ).toBe(
      "elb({ name: 'order complete', data: { id: '0rd3r1d' }, nested: [{ entity: 'product', … }] })",
    );
  });
});

describe('tokenizeCode', () => {
  it('colours calls, strings, keys and numbers and marks the highlighted string', () => {
    expect(
      tokenizeCode("gtag('event', 'view_item', {", 'view_item').map((token) => [
        token.t,
        token.kind,
        token.mark,
      ]),
    ).toEqual([
      ['gtag', 'fn', undefined],
      ['(', 'punct', undefined],
      ["'event'", 'value', undefined],
      [',', 'punct', undefined],
      [' ', 'text', undefined],
      ["'view_item'", 'value', 'entity'],
      [',', 'punct', undefined],
      [' ', 'text', undefined],
      ['{', 'punct', undefined],
    ]);
    expect(tokenizeCode('  send_to: 1,').map((token) => token.kind)).toEqual([
      'text',
      'key',
      'punct',
      'text',
      'num',
      'punct',
    ]);
  });
});
