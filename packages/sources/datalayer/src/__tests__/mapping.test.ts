import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';

describe('mapping', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  function gtag(...args: unknown[]) {
    args;
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }

  const product1 = {
    item_id: 'abc',
    item_name: 'Everyday Ruck Snack',
    discount: 10,
    item_brand: 'Fictive',
    item_category: 'Apparel',
    item_list_id: 'related_products',
    item_variant: 'black',
    price: 420,
    quantity: 2,
  };
  const product2 = {
    item_id: 'xyz',
    item_name: 'Cool Cap',
    price: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.dataLayer = [];
    dataLayer = window.dataLayer as DataLayer;
  });

  test('init dataLayer', () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    sourceDataLayer({ elb });
    expect(window.dataLayer).toBeDefined();
  });

  test('gtag call', () => {
    sourceDataLayer({ elb });

    gtag('event', 'foo', { bar: 'baz' });
    expect(elb).toHaveBeenCalledWith({
      event: 'dataLayer foo',
      id: expect.any(String),
      data: {
        event: 'foo',
        bar: 'baz',
      },
      source: { type: 'dataLayer' },
    });
  });

  test('dataLayer push', () => {
    sourceDataLayer({ elb });

    window.dataLayer!.push({ event: 'foo', bar: 'baz' });
    expect(elb).toHaveBeenCalledWith({
      event: 'dataLayer foo',
      id: expect.any(String),
      data: {
        event: 'foo',
        bar: 'baz',
      },
      source: { type: 'dataLayer' },
    });
  });

  test('default values', () => {
    sourceDataLayer({ elb })!;

    dataLayer.push({ event: 'foo this' });
    expect(elb).toHaveBeenCalledWith({
      event: 'dataLayer foo_this',
      id: expect.any(String),
      data: {
        event: 'foo this',
      },
      source: { type: 'dataLayer' },
    });
  });

  test('mapping name', () => {
    sourceDataLayer({
      elb,
      mapping: {
        foo: { name: 'bar' },
        baz: {
          name: 'nope',
          data: { map: { event: { value: 'prioritize' } } },
        },
      },
    })!;

    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledWith(expect.objectContaining({ event: 'bar' }));
    dataLayer.push({ event: 'baz' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'prioritize' }),
    );
  });

  test('mapping ignore', () => {
    sourceDataLayer({
      elb,
      mapping: {
        foo: {
          ignore: true,
        },
      },
    })!;

    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('mapping *', () => {
    sourceDataLayer({
      elb,
      mapping: {
        '*': { ignore: true },
        foo: {},
      },
    })!;

    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(1);

    jest.resetAllMocks();
    dataLayer.push({ event: 'bar' });
    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('mapping all', () => {
    sourceDataLayer({
      elb,
      mapping: {
        foo: {
          data: {
            map: {
              event: { value: 'entity action' },
              data: {
                map: {
                  some: { value: 'thing' },
                  key: 'dynamic',
                },
              },
              context: {
                map: { foo: { value: 'bar' } },
              },
              globals: { map: { foo: { value: 'bar' } } },
              custom: { map: { completely: { value: 'random' } } },
              user: { map: { hash: { value: 'h4sh' } } },
              nested: {
                loop: ['this', { map: { type: { value: 'foo' } } }],
              },
              consent: { map: { demo: { value: true } } },
              id: { value: '1d' },
              trigger: { value: 'push' },
              entity: { value: 'entity' },
              action: { value: 'action' },
              timestamp: { value: 1626780000 },
              timing: { value: 3.14 },
              group: { value: 'group' },
              count: { value: 1 },
              version: {
                map: {
                  source: { value: '0.0.7' },
                  tagging: { value: 1 },
                },
              },
              source: {
                map: {
                  type: { value: 'test' },
                  id: { value: 'https://localhost:80' },
                  previous_id: { value: 'http://remotehost:9001' },
                },
              },
            },
          },
        },
      },
    })!;

    window.dataLayer!.push({ event: 'foo', dynamic: 'value', id: '1d' });
    expect(elb).toHaveBeenCalledWith({
      event: 'entity action',
      data: {
        some: 'thing',
        key: 'value',
      },
      context: {
        foo: ['bar', 0],
      },
      globals: { foo: 'bar' },
      custom: { completely: 'random' },
      user: { hash: 'h4sh' },
      nested: [{ type: 'foo', data: {}, context: {}, nested: [] }],
      consent: { demo: true },
      id: '1d',
      trigger: 'push',
      entity: 'entity',
      action: 'action',
      timestamp: 1626780000,
      timing: 3.14,
      group: 'group',
      count: 1,
      version: {
        source: '0.0.7',
        tagging: 1,
      },
      source: {
        type: 'test',
        id: 'https://localhost:80',
        previous_id: 'http://remotehost:9001',
      },
    });
  });

  test('mapping add_to_cart', () => {
    sourceDataLayer({
      elb,
      mapping: {
        add_to_cart: {
          name: 'product add',
          data: {
            map: {
              data: {
                map: {
                  id: 'items.0.item_id',
                  name: 'items.0.item_name',
                  discount: 'items.0.discount',
                  brand: 'items.0.item_brand',
                  category: 'items.0.item_category',
                  color: 'items.0.item_variant',
                  currency: 'currency',
                  price: 'items.0.price',
                  quantity: 'items.0.quantity',
                  total: 'value',
                },
              },
            },
            // context list
          },
        },
      },
    })!;

    dataLayer.push({
      event: 'add_to_cart',
      currency: 'EUR',
      value: 840,
      items: [product1],
    });

    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'product add',
        data: {
          currency: 'EUR',
          id: 'abc',
          name: 'Everyday Ruck Snack',
          discount: 10,
          brand: 'Fictive',
          category: 'Apparel',
          color: 'black',
          price: 420,
          quantity: 2,
          total: 840,
        },
      }),
    );
  });

  test('mapping purchase', () => {
    sourceDataLayer({
      elb,
      mapping: {
        purchase: {
          name: 'order complete',
          data: {
            map: {
              data: {
                map: {
                  id: 'transaction_id',
                  currency: 'currency',
                  shipping: 'shipping',
                  taxes: 'tax',
                  total: 'value',
                  coupon: 'coupon',
                },
              },
              nested: {
                loop: [
                  'items',
                  {
                    map: {
                      data: {
                        map: {
                          id: 'item_id',
                          name: 'item_name',
                          price: 'price',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    })!;

    dataLayer.push({
      event: 'purchase',
      transaction_id: '0rd3r1d',
      currency: 'EUR',
      shipping: 5.22,
      tax: 73.76,
      value: 555,
      coupon: 'SUMM3RS4L3',
      items: [product1, product2],
    });

    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'order complete',
        data: {
          id: '0rd3r1d',
          currency: 'EUR',
          shipping: 5.22,
          taxes: 73.76,
          total: 555,
          coupon: 'SUMM3RS4L3',
        },
        nested: [
          {
            type: 'product',
            data: {
              id: 'abc',
              name: 'Everyday Ruck Snack',
              price: 420,
            },
            nested: [],
            context: {},
          },
          {
            type: 'product',
            data: {
              id: 'xyz',
              name: 'Cool Cap',
              price: 42,
            },
            nested: [],
            context: {},
          },
        ],
      }),
    );
  });

  test('gtag no arguments', () => {
    sourceDataLayer({ elb })!;
    gtag();
    expect(elb).toHaveBeenCalledTimes(0);

    gtag('e');
    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('gtag event', () => {
    sourceDataLayer({ elb })!;

    gtag('event');
    expect(elb).toHaveBeenCalledTimes(0);

    gtag('event', 'foo');
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer foo',
      }),
    );

    gtag('event', 'foo', { foo: 'bar' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer foo',
        data: { event: 'foo', foo: 'bar' },
      }),
    );

    gtag('event', 'foo', { count: 5 });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer foo',
        data: { event: 'foo', count: 5 },
      }),
    );

    gtag('event', 'foo', { foo: 'bar', count: 3 });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer foo',
        data: { event: 'foo', foo: 'bar', count: 3 },
      }),
    );

    gtag('event', 'foo', 'not-an-object');
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer foo',
      }),
    );
  });

  test('gtag config', () => {
    sourceDataLayer({ elb });

    gtag('config', 'GA-XXXXXXXXXX');
    expect(elb).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'dataLayer config_GA-XXXXXXXXXX',
      }),
    );

    gtag('config', 'GA-XXXXXXXXXX', { send_page_view: false });
    expect(elb).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'dataLayer config_GA-XXXXXXXXXX',
        data: {
          event: 'config GA-XXXXXXXXXX',
          send_page_view: false,
        },
      }),
    );

    gtag('config', 'GA-XXXXXXXXXX', 'non-object');
    expect(elb).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'dataLayer config_GA-XXXXXXXXXX',
        data: { event: 'config GA-XXXXXXXXXX' },
      }),
    );

    jest.clearAllMocks();
    gtag('config');
    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('gtag get', () => {
    sourceDataLayer({ elb });

    gtag('get', 'campaign');
    expect(elb).toHaveBeenCalledTimes(0);
  });

  test('gtag set', () => {
    sourceDataLayer({ elb });

    gtag('set', 'campaign', { id: 'abc' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'dataLayer set_campaign',
        data: {
          event: 'set campaign',
          id: 'abc',
        },
      }),
    );

    gtag('set', { currency: 'EUR' });
    expect(elb).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'dataLayer set_custom',
        data: {
          event: 'set custom',
          currency: 'EUR',
        },
      }),
    );

    gtag('set', 'user_properties', 'invalid');
    expect(elb).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'dataLayer set_user_properties',
      }),
    );
  });

  test('filter parameters', () => {
    sourceDataLayer({ elb });

    gtag('event', 'foo', {
      elem: document.createElement('div'),
      fn: jest.fn(),
      a: '',
    });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          event: 'foo',
          a: '',
        },
      }),
    );
  });
});
