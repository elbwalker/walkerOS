import type { MethodName } from '../methods';
import { isMethodName, methodParams } from '../methods';

type Row = [MethodName, unknown[], unknown];

const ITEMS = [{ sku: 'ers', name: 'Everyday Ruck Snack', price: 420 }];
const EC_ITEMS = '[["ers","Everyday Ruck Snack","",420,1]]';

describe('methodParams', () => {
  it.each<Row>([
    ['trackPageView', [], { params: [] }],
    ['trackPageView', ['Home'], { params: [['action_name', 'Home']] }],

    [
      'trackEvent',
      ['video', 'play', 'Intro', '30'],
      {
        params: [
          ['e_c', 'video'],
          ['e_a', 'play'],
          ['e_n', 'Intro'],
          ['e_v', '30'],
        ],
      },
    ],
    [
      'trackEvent',
      [undefined, 'play'],
      { invalid: 'trackEvent: category missing' },
    ],
    ['trackEvent', ['video', ''], { invalid: 'trackEvent: action missing' }],
    [
      'trackEvent',
      ['video', 'play', 'Intro', 'long'],
      { invalid: 'trackEvent: value not a number' },
    ],

    [
      'trackGoal',
      [3, '9.5'],
      {
        params: [
          ['idgoal', '3'],
          ['revenue', '9.5'],
        ],
      },
    ],
    ['trackGoal', ['4'], { params: [['idgoal', '4']] }],
    ['trackGoal', [], { invalid: 'trackGoal: idGoal missing' }],
    ['trackGoal', [0], { invalid: 'trackGoal: idGoal not a positive integer' }],
    [
      'trackGoal',
      ['1.5'],
      { invalid: 'trackGoal: idGoal not a positive integer' },
    ],
    [
      'trackGoal',
      [3, 'a lot'],
      { invalid: 'trackGoal: customRevenue not a number' },
    ],

    [
      'trackSiteSearch',
      ['rucksack', 'bags', 12],
      {
        params: [
          ['search', 'rucksack'],
          ['search_cat', 'bags'],
          ['search_count', '12'],
        ],
      },
    ],
    ['trackSiteSearch', [], { invalid: 'trackSiteSearch: keyword missing' }],
    [
      'trackSiteSearch',
      ['rucksack', undefined, 'many'],
      { invalid: 'trackSiteSearch: resultsCount not a number' },
    ],
    [
      'trackSiteSearch',
      ['rucksack', undefined, 1.5],
      { invalid: 'trackSiteSearch: resultsCount not an integer' },
    ],

    [
      'trackLink',
      ['https://github.com/', 'link'],
      { params: [['link', 'https://github.com/']] },
    ],
    [
      'trackLink',
      ['https://www.example.com/a.pdf', 'download'],
      { params: [['download', 'https://www.example.com/a.pdf']] },
    ],
    ['trackLink', [undefined, 'link'], { invalid: 'trackLink: url missing' }],
    [
      'trackLink',
      ['https://github.com/'],
      { invalid: 'trackLink: linkType missing' },
    ],
    [
      'trackLink',
      ['https://github.com/', 'outlink'],
      { invalid: 'trackLink: linkType must be link or download' },
    ],

    [
      'trackContentImpression',
      ['Sale', 'banner', 'https://www.example.com/sale'],
      {
        params: [
          ['c_n', 'Sale'],
          ['c_p', 'banner'],
          ['c_t', 'https://www.example.com/sale'],
        ],
      },
    ],
    [
      'trackContentImpression',
      [],
      { invalid: 'trackContentImpression: contentName missing' },
    ],
    [
      'trackContentInteraction',
      ['click', 'Sale', 'banner'],
      {
        params: [
          ['c_i', 'click'],
          ['c_n', 'Sale'],
          ['c_p', 'banner'],
        ],
      },
    ],
    [
      'trackContentInteraction',
      [undefined, 'Sale'],
      { invalid: 'trackContentInteraction: contentInteraction missing' },
    ],
    [
      'trackContentInteraction',
      ['click'],
      { invalid: 'trackContentInteraction: contentName missing' },
    ],
    [
      'ping',
      [42500],
      {
        params: [
          ['ping', '1'],
          ['pv_time', '43'],
        ],
      },
    ],
    ['ping', [400], { params: [['ping', '1']] }],
    ['ping', [], { params: [['ping', '1']] }],
    ['ping', ['soon'], { invalid: 'ping: totalMs not a number' }],
  ])('%s %j', (method, args, expected) => {
    expect(methodParams(method, args)).toEqual(expected);
  });

  it.each<[MethodName, unknown[], unknown, unknown]>([
    [
      'trackEcommerceOrder',
      ['0rd3r1d', 467.22, 462, 73.76, 5.22, 10],
      ITEMS,
      {
        params: [
          ['idgoal', '0'],
          ['ec_id', '0rd3r1d'],
          ['revenue', '467.22'],
          ['ec_st', '462'],
          ['ec_tx', '73.76'],
          ['ec_sh', '5.22'],
          ['ec_dt', '10'],
          ['ec_items', EC_ITEMS],
        ],
      },
    ],
    [
      'trackEcommerceOrder',
      ['0rd3r1d', 467.22],
      undefined,
      {
        params: [
          ['idgoal', '0'],
          ['ec_id', '0rd3r1d'],
          ['revenue', '467.22'],
        ],
      },
    ],
    [
      'trackEcommerceOrder',
      [undefined, 467.22],
      ITEMS,
      { invalid: 'trackEcommerceOrder: orderId missing' },
    ],
    [
      'trackEcommerceOrder',
      ['0rd3r1d'],
      ITEMS,
      { invalid: 'trackEcommerceOrder: grandTotal missing' },
    ],
    [
      'trackEcommerceOrder',
      ['0rd3r1d', 467.22, 'n/a'],
      ITEMS,
      { invalid: 'trackEcommerceOrder: subTotal not a number' },
    ],
    [
      'trackEcommerceOrder',
      ['0rd3r1d', 467.22],
      [{ name: 'no sku' }],
      { invalid: 'trackEcommerceOrder: items[0].sku missing' },
    ],
    [
      'trackEcommerceCartUpdate',
      [840],
      ITEMS,
      {
        params: [
          ['idgoal', '0'],
          ['revenue', '840'],
          ['ec_items', EC_ITEMS],
        ],
      },
    ],
    [
      'trackEcommerceCartUpdate',
      ['free'],
      ITEMS,
      { invalid: 'trackEcommerceCartUpdate: grandTotal not a number' },
    ],
  ])('%s %j with items %j', (method, args, items, expected) => {
    expect(methodParams(method, args, items)).toEqual(expected);
  });

  it.each([
    ['trackPageView', true],
    ['ping', true],
    ['setEcommerceView', false],
    ['trackRequest', false],
  ])('%s is a method name: %s', (name, expected) => {
    expect(isMethodName(name)).toBe(expected);
  });
});
