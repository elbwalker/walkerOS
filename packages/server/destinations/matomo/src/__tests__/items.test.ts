import type { Collector } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { buildHits } from '../hits';
import { toEcItems, toEcommerceView } from '../items';

const CATEGORIES = ['a', 'b', 'c', 'd', 'e'];

describe('toEcItems', () => {
  it.each<[string, unknown, unknown]>([
    [
      'Matomo defaults for a bare sku',
      [{ sku: 'ers' }, { sku: 7 }],
      { json: '[["ers","","",0,1],["7","","",0,1]]' },
    ],
    [
      'every field',
      [
        {
          sku: 'ers',
          name: 'Snack',
          category: 'Bags',
          price: '4.2',
          quantity: 2,
        },
      ],
      { json: '[["ers","Snack","Bags",4.2,2]]' },
    ],
    [
      'five categories',
      [{ sku: 'ers', category: CATEGORIES }],
      { json: '[["ers","",["a","b","c","d","e"],0,1]]' },
    ],
    [
      'six categories',
      [{ sku: 'ers', category: [...CATEGORIES, 'f'] }],
      { invalid: 'trackEcommerceOrder: items[0].category more than 5' },
    ],
    [
      'an item without a sku',
      [{ sku: 'ers' }, { name: 'Snack' }],
      { invalid: 'trackEcommerceOrder: items[1].sku missing' },
    ],
    [
      'an item that is no object',
      ['ers'],
      { invalid: 'trackEcommerceOrder: items[0].sku missing' },
    ],
    [
      'a price that is not a number',
      [{ sku: 'ers', price: 'abc' }],
      { invalid: 'trackEcommerceOrder: items[0].price not a number' },
    ],
    [
      'a quantity that is not a number',
      [{ sku: 'ers', quantity: 'two' }],
      { invalid: 'trackEcommerceOrder: items[0].quantity not a number' },
    ],
    [
      'items that are no list',
      { sku: 'ers' },
      { invalid: 'trackEcommerceOrder: items not a list' },
    ],
  ])('%s', (_, value, expected) => {
    expect(toEcItems(value, 'trackEcommerceOrder')).toEqual(expected);
  });
});

describe('toEcommerceView', () => {
  it.each<[string, unknown, unknown]>([
    [
      'all four fields',
      { sku: 'ers', name: 'Snack', category: 'Bags', price: 420 },
      {
        params: [
          ['_pks', 'ers'],
          ['_pkn', 'Snack'],
          ['_pkc', 'Bags'],
          ['_pkp', '420'],
        ],
        dropped: [],
      },
    ],
    [
      'a category list',
      { sku: 'ers', category: ['Bags', 'Backpacks'] },
      {
        params: [
          ['_pks', 'ers'],
          ['_pkc', '["Bags","Backpacks"]'],
        ],
        dropped: [],
      },
    ],
    [
      'no sku',
      { name: 'Snack', price: 420 },
      { params: [], dropped: ['ecommerceView (no sku)'] },
    ],
    [
      'nothing resolved',
      undefined,
      { params: [], dropped: ['ecommerceView (no sku)'] },
    ],
    [
      'a price that is not a number',
      { sku: 'ers', price: 'abc' },
      {
        params: [['_pks', 'ers']],
        dropped: ['ecommerceView.price (not a number)'],
      },
    ],
  ])('%s', (_, value, expected) => {
    expect(toEcommerceView(value)).toEqual(expected);
  });

  describe('on another method', () => {
    let collector: Collector.Instance;

    beforeAll(async () => {
      ({ collector } = await startFlow());
    });

    it('is invalid on trackEvent', async () => {
      // The collector renames the event to its rule name before the push.
      const event = { ...getEvent('product view'), name: 'trackEvent' };
      const result = await buildHits(
        {
          event,
          rule: {
            name: 'trackEvent',
            settings: { ecommerceView: { map: { sku: 'data.id' } } },
          },
          data: ['product', 'view'],
        },
        { url: 'https://m.example.com/', siteId: '1' },
        collector,
      );
      expect(result).toEqual({
        invalid: 'trackEvent: ecommerceView only on trackPageView',
      });
    });
  });
});
