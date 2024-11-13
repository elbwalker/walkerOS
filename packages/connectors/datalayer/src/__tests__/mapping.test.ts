import type { WalkerOS } from '@elbwalker/types';
import { clone } from '@elbwalker/utils';
import { gtagToObj } from '../mapping';
import { connectorDataLayer } from '..';

describe('mapping', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);

  function gtag(...args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    return clone(arguments as unknown as WalkerOS.AnyObject) || args;
  }

  beforeEach(() => {});

  test('gtagToObj no arguments', () => {
    expect(gtagToObj(gtag())).toBeUndefined();
    expect(gtagToObj(gtag('e'))).toBeUndefined();
  });

  test('gtagToObj event', () => {
    expect(gtagToObj(gtag('event'))).toStrictEqual({
      event: undefined,
    });

    expect(gtagToObj(gtag('event', 'foo'))).toStrictEqual({
      event: 'foo',
    });

    expect(gtagToObj(gtag('event', 'foo', { foo: 'bar' }))).toStrictEqual({
      event: 'foo',
      foo: 'bar',
    });

    expect(gtagToObj(gtag('event', 'foo', { count: 5 }))).toStrictEqual({
      event: 'foo',
      count: 5,
    });

    expect(
      gtagToObj(gtag('event', 'foo', { foo: 'bar', count: 3 })),
    ).toStrictEqual({
      event: 'foo',
      foo: 'bar',
      count: 3,
    });

    expect(gtagToObj(gtag('event', 'foo', 'not-an-object'))).toStrictEqual({
      event: 'foo',
    });
  });

  test('gtagToObj config', () => {
    expect(gtagToObj(gtag('config', 'GA-XXXXXXXXXX'))).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
    });

    expect(
      gtagToObj(gtag('config', 'GA-XXXXXXXXXX', { send_page_view: false })),
    ).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
      send_page_view: false,
    });

    expect(
      gtagToObj(gtag('config', 'GA-XXXXXXXXXX', 'non-object')),
    ).toStrictEqual({
      event: 'config GA-XXXXXXXXXX',
    });

    expect(gtagToObj(gtag('config'))).toStrictEqual({
      event: undefined,
    });
  });

  test('gtagToObj consent', () => {
    expect(
      gtagToObj(
        gtag('consent', 'default', {
          ad_storage: true,
          analytics_storage: false,
          wait_for_update: 500,
        }),
      ),
    ).toStrictEqual({
      event: 'consent default',
      ad_storage: true,
      analytics_storage: false,
      wait_for_update: 500,
    });

    expect(
      gtagToObj(gtag('consent', 'update', { ad_storage: 'granted' })),
    ).toStrictEqual({
      event: 'consent update',
      ad_storage: true,
    });

    expect(
      gtagToObj(gtag('consent', 'update', { analytics_storage: 'denied' })),
    ).toStrictEqual({
      event: 'consent update',
      analytics_storage: false,
    });

    expect(gtagToObj(gtag('consent', 'update', 'invalid-param'))).toStrictEqual(
      { event: 'consent update' },
    );
    expect(gtagToObj(gtag('consent', 'update'))).toStrictEqual({
      event: 'consent update',
    });
    expect(gtagToObj(gtag('consent'))).toStrictEqual({
      event: undefined,
    });
  });

  test('gtagToObj get', () => {
    expect(gtagToObj(gtag('get', 'campaign'))).toBeUndefined();
  });

  test('gtagToObj set', () => {
    expect(
      gtagToObj(
        gtag('set', 'campaign', {
          id: 'abc',
        }),
      ),
    ).toStrictEqual({
      event: 'set campaign',
      id: 'abc',
    });

    expect(gtagToObj(gtag('set', { currency: 'USD' }))).toStrictEqual({
      event: undefined,
    });

    expect(gtagToObj(gtag('set', 'user_properties', 'invalid'))).toStrictEqual({
      event: 'set user_properties',
    });
  });

  test('mapping', () => {
    const { dataLayer } = connectorDataLayer({
      elb,
      mapping: {
        foo: {
          event: 'entity action',
          data: {
            some: {
              value: 'thing',
            },
            key: 'dynamic',
          },
        },
        add_to_cart: {
          event: 'product add',
          data: {
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
          // context list
        },
      },
    })!;

    dataLayer.push({ event: 'foo', dynamic: 'value' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        data: {
          some: 'thing',
          key: 'value',
        },
      }),
    );

    dataLayer.push({
      event: 'add_to_cart',
      currency: 'EUR',
      value: 840,
      items: [
        {
          item_id: 'abc',
          item_name: 'Everyday Ruck Snack',
          discount: 10,
          item_brand: 'Fictive',
          item_category: 'Apparel',
          item_list_id: 'related_products',
          item_variant: 'black',
          price: 420,
          quantity: 2,
        },
      ],
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
});
