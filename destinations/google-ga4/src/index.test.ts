import Elbwalker, { IElbwalker, Walker } from '@elbwalker/walker.js';
import { DestinationGoogleGA4 } from './types';

describe('Destination Google GA4', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationGoogleGA4.Function,
    config: DestinationGoogleGA4.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';
  const data = { foo: 'bar' };
  const trigger = 'manual';
  const measurementId = 'G-XXXXXX-1';
  const transport_url = 'https://collect.example.com';

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    config = {
      custom: { measurementId },
    };

    destination = require('.').default;
    destination.config = config;

    w.elbLayer = [];
    w.dataLayer = [];

    elbwalker = Elbwalker({ pageview: false });
    elbwalker.push('walker run');
    w.gtag = mockFn;
  });

  test('Init', () => {
    (w.dataLayer as any) = undefined;
    (w.gtag as any) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    destination.config = config;
    elbwalker.push('walker destination', destination);
    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();

    expect(w.dataLayer?.length).toBe(3);
  });

  test('Init calls', () => {
    destination.config = config;
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', measurementId, {});
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('debug mode', () => {
    config.custom!.debug = true;
    destination.config = config;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      event,
      expect.objectContaining({ debug_mode: true }),
    );
  });

  test('Push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });
    expect(mockFn).toHaveBeenCalledWith('event', event, data);
  });

  test('Settings', () => {
    config.custom!.transport_url = transport_url;
    destination.config = config;

    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });

    expect(mockFn).toHaveBeenCalledWith('config', measurementId, {
      transport_url,
    });

    expect(mockFn).toHaveBeenCalledWith('event', event, data);
  });

  test.only('Items mapping', () => {
    const nested: Walker.Entities = [
      {
        type: 'product',
        data: {
          id: 'SKU_12345',
          name: 'Stan and Friends Tee',
          brand: 'ACME',
          price: 9.99,
          quantity: 1,
        },
        nested: [],
        context: {},
      },
      {
        type: 'product',
        data: {
          id: 'SKU_12346',
          name: "Google Grey Women's Tee",
          category: 'Apparel',
          price: 20.99,
          quantity: 1,
        },
        nested: [],
        context: { source: ['related_products', 0] },
      },
    ];

    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        params: {
          currency: 'data.currency',
          override: 'data.old', // override at event level
          value: 'data.revenue',
        },
      },
      init: true,
      mapping: {
        ga4: {
          params: {
            name: 'ga4_params',
            custom: {
              params: {
                override: 'data.override',
                position: 'context.position.0',
                session: 'user.session',
                timing: 'timing',
                lang: 'globals.lang',
              },
            },
          },
        },
        product: {
          add: {
            name: 'add_to_cart',
            custom: {
              items: {
                params: {
                  item_id: 'data.id',
                  item_category: 'data.category',
                  quantity: 'data.quantity',
                },
              },
              params: {
                value: 'data.price',
              },
            },
          },
        },
        order: {
          complete: {
            name: 'purchase',
            custom: {
              items: {
                params: {
                  item_id: 'data.id',
                },
              },
              params: {
                transaction_id: 'data.id',
              },
            },
          },
        },
      },
    };
    elbwalker.push('walker destination', destination, config);
    elbwalker.push('walker config', {
      globals: { lang: 'de' },
      user: { session: 'now' },
    });

    elbwalker.push(
      'ga4 params',
      { old: false, override: 'important' },
      trigger,
      { position: ['reco', 0] },
      nested,
    );

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'ga4_params',
      expect.objectContaining({
        lang: 'de',
        override: 'important',
        position: 'reco',
        session: 'now',
        timing: expect.any(Number),
      }),
    );

    elbwalker.push('product add', {
      id: 'sku',
      category: 'Examples',
      currency: 'EUR',
      price: 7.77,
      quantity: 1, // @TODO Default value
    });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'add_to_cart',
      expect.objectContaining({
        currency: 'EUR',
        value: 7.77,
        items: [
          {
            item_id: 'sku',
            item_category: 'Examples',
            quantity: 1,
          },
        ],
      }),
    );

    //   elbwalker.push(
    //     'order complete',
    //     {
    //       id: 'T_12345_1',
    //       nope_id: 'ignore me',
    //       revenue: 25.42,
    //       tax: 4.9,
    //       shipping: 5.99,
    //       currency: 'USD',
    //     },
    //     trigger,
    //     { key: ['value', 0] },
    //     nested,
    //   );

    //   expect(mockFn).toHaveBeenCalledWith(
    //     'event',
    //     'purchase',
    //     expect.objectContaining({
    //       transaction_id: 'T_12345_1',
    //       session: 'now',
    //       timing: expect.any(Number),
    //       lang: 'de',
    //       currency: 'USD',
    //       value: 25.42,
    //       items: [
    //         {
    //           item_id: 'SKU_12345',
    //           item_name: 'Stan and Friends Tee',
    //           index: 0,
    //           item_brand: 'ACME',
    //           price: 9.99,
    //           quantity: 1,
    //         },
    //         {
    //           item_id: 'SKU_12346',
    //           item_name: "Grey Women's Tee",
    //           index: 1,
    //           item_category: 'Apparel',
    //           item_list_id: 'related_products',
    //           price: 20.99,
    //           quantity: 1,
    //         },
    //       ],
    //     }),
    //   );
    // });
  });
});
