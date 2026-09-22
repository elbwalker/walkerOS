import type { Hit } from '../types';
import type { MethodName } from '../methods';
import { isMethodName, methodParams } from '../methods';

const product = { sku: 'ers', name: 'Everyday Ruck Snack', price: 420 };
const products = [product];
const ecProducts =
  '[["ers","Everyday Ruck Snack",null,420,null,null,null,null]]';

describe('methodParams', () => {
  it.each<[MethodName, unknown[], Hit]>([
    ['trackPageView', ['Home'], [['action_name', 'Home']]],
    ['trackPageView', [], []],
    [
      'trackEvent',
      ['promotion', 'visible', 'Hero', 3],
      [
        ['e_c', 'promotion'],
        ['e_a', 'visible'],
        ['e_n', 'Hero'],
        ['e_v', '3'],
      ],
    ],
    [
      'trackGoal',
      ['goal_1', 99.9],
      [
        ['idgoal', 'goal_1'],
        ['revenue', '99.9'],
      ],
    ],
    [
      'trackSiteSearch',
      ['shoes', ['footwear', 'sale'], 12],
      [
        ['search', 'shoes'],
        ['search_cats', '["footwear","sale"]'],
        ['search_count', '12'],
      ],
    ],
    [
      'trackLink',
      ['https://example.com/', 'link'],
      [
        ['link', 'https://example.com/'],
        ['url', 'https://example.com/'],
      ],
    ],
    [
      'trackLink',
      ['https://example.com/a.pdf', 'download'],
      [
        ['download', 'https://example.com/a.pdf'],
        ['url', 'https://example.com/a.pdf'],
      ],
    ],
    [
      'trackContentImpression',
      ['Banner', 'hero.png', '/sale'],
      [
        ['c_n', 'Banner'],
        ['c_p', 'hero.png'],
        ['c_t', '/sale'],
      ],
    ],
    [
      'trackContentInteraction',
      ['click', 'Banner', 'hero.png', '/sale'],
      [
        ['c_i', 'click'],
        ['c_n', 'Banner'],
        ['c_p', 'hero.png'],
        ['c_t', '/sale'],
      ],
    ],
    [
      'ecommerceProductDetailView',
      [products],
      [
        ['e_t', 'product-detail-view'],
        ['ec_products', ecProducts],
      ],
    ],
    [
      'ecommerceAddToCart',
      [products],
      [
        ['e_t', 'add-to-cart'],
        ['ec_products', ecProducts],
      ],
    ],
    [
      'ecommerceRemoveFromCart',
      [products],
      [
        ['e_t', 'remove-from-cart'],
        ['ec_products', ecProducts],
      ],
    ],
    [
      'ecommerceCartUpdate',
      [products, 840],
      [
        ['e_t', 'cart-update'],
        ['ec_products', ecProducts],
        ['revenue', '840'],
      ],
    ],
    [
      'ecommerceOrder',
      [
        products,
        {
          orderId: '0rd3r1d',
          grandTotal: 555,
          subTotal: 500,
          tax: 73.76,
          shipping: 5.22,
          discount: 10,
        },
      ],
      [
        ['e_t', 'order'],
        ['ec_id', '0rd3r1d'],
        ['revenue', '555'],
        ['ec_st', '500'],
        ['ec_tx', '73.76'],
        ['ec_sh', '5.22'],
        ['ec_dt', '10'],
        ['ec_products', ecProducts],
      ],
    ],
    ['ping', [], [['ping', '6']]],
  ])('%s %j', (name, args, params) => {
    expect(methodParams(name, args)).toEqual({ params });
  });

  it.each<[MethodName, unknown[], string]>([
    ['trackEvent', [undefined, 'visible'], 'trackEvent: category missing'],
    ['trackEvent', ['', 'visible'], 'trackEvent: category missing'],
    ['trackEvent', ['promotion'], 'trackEvent: action missing'],
    ['trackGoal', [], 'trackGoal: goalId missing'],
    ['trackSiteSearch', [null], 'trackSiteSearch: keyword missing'],
    ['trackLink', [undefined, 'link'], 'trackLink: address missing'],
    ['trackLink', ['https://example.com/'], 'trackLink: type missing'],
    ['trackContentImpression', [], 'trackContentImpression: name missing'],
    [
      'trackContentInteraction',
      [undefined, 'Banner'],
      'trackContentInteraction: interaction missing',
    ],
    [
      'trackContentInteraction',
      ['click'],
      'trackContentInteraction: name missing',
    ],
    [
      'ecommerceProductDetailView',
      [],
      'ecommerceProductDetailView: products missing',
    ],
    ['ecommerceAddToCart', [], 'ecommerceAddToCart: products missing'],
    [
      'ecommerceRemoveFromCart',
      [],
      'ecommerceRemoveFromCart: products missing',
    ],
    ['ecommerceCartUpdate', [], 'ecommerceCartUpdate: products missing'],
    [
      'ecommerceCartUpdate',
      [products],
      'ecommerceCartUpdate: grandTotal missing',
    ],
    ['ecommerceOrder', [], 'ecommerceOrder: products missing'],
    ['ecommerceOrder', [products], 'ecommerceOrder: info missing'],
    [
      'ecommerceOrder',
      [products, { grandTotal: 555 }],
      'ecommerceOrder: orderId missing',
    ],
    [
      'ecommerceOrder',
      [products, { orderId: 'o1' }],
      'ecommerceOrder: grandTotal missing',
    ],
  ])('%s %j is invalid', (name, args, invalid) => {
    expect(methodParams(name, args)).toEqual({ invalid });
  });

  it('rejects a non-numeric event value', () => {
    expect(methodParams('trackEvent', ['c', 'a', 'n', 'abc'])).toEqual({
      invalid: 'trackEvent: value not numeric',
    });
  });

  it('accepts a numeric string as event value', () => {
    expect(methodParams('trackEvent', ['c', 'a', undefined, '4.5'])).toEqual({
      params: [
        ['e_c', 'c'],
        ['e_a', 'a'],
        ['e_v', '4.5'],
      ],
    });
  });

  it('treats an optional empty string as missing', () => {
    expect(methodParams('trackEvent', ['c', 'a', '', ''])).toEqual({
      params: [
        ['e_c', 'c'],
        ['e_a', 'a'],
      ],
    });
  });

  it('rejects a link type other than link or download', () => {
    expect(
      methodParams('trackLink', ['https://example.com/', 'other']),
    ).toEqual({ invalid: 'trackLink: type must be link or download' });
  });

  it('wraps a string search category in an array', () => {
    expect(methodParams('trackSiteSearch', ['shoes', 'x'])).toEqual({
      params: [
        ['search', 'shoes'],
        ['search_cats', '["x"]'],
      ],
    });
  });

  it('stringifies non-string search categories', () => {
    expect(methodParams('trackSiteSearch', ['shoes', [1, 2]])).toEqual({
      params: [
        ['search', 'shoes'],
        ['search_cats', '["1","2"]'],
      ],
    });
  });

  it('ignores arguments beyond the method list', () => {
    const info = { orderId: 'o1', grandTotal: 10 };
    expect(
      methodParams('ecommerceOrder', [products, info, { currencyCode: 'EUR' }]),
    ).toEqual(methodParams('ecommerceOrder', [products, info]));
  });
});

describe('isMethodName', () => {
  it.each([
    ['trackEvent', true],
    ['ping', true],
    ['setUserId', false],
  ])('%s is %s', (name, expected) => {
    expect(isMethodName(name)).toBe(expected);
  });
});
