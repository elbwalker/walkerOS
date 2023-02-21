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
    const data_ecom = {
      id: 'T_12345_1',
      nope_id: 'ignore me',
      revenue: 25.42,
      tax: 4.9,
      shipping: 5.99,
      currency: 'USD',
    };
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
    const ga4purchase = {
      transaction_id: 'T_12345_1',
      session: 'now',
      timing: expect.any(Number),
      lang: 'de',
      currency: 'USD',
      value: 25.42,
      // items: [
      //   {
      //     item_id: 'SKU_12345',
      //     item_name: 'Stan and Friends Tee',
      //     index: 0,
      //     item_brand: 'ACME',
      //     price: 9.99,
      //     quantity: 1,
      //   },
      //   {
      //     item_id: 'SKU_12346',
      //     item_name: "Grey Women's Tee",
      //     index: 1,
      //     item_category: 'Apparel',
      //     item_list_id: 'related_products',
      //     price: 20.99,
      //     quantity: 1,
      //   },
      // ],
    };

    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        properties: {
          transaction_id: 'data.nope_id', // override at order complete
          value: 'data.revenue',
        },
      },
      init: true,
      mapping: {
        order: {
          complete: {
            name: 'purchase',
            custom: {
              properties: {
                transaction_id: 'data.id',
                session: 'user.session',
                timing: 'timing',
                lang: 'globals.lang',
                currency: 'data.currency',
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
      'order complete',
      data_ecom,
      trigger,
      { key: ['value', 1] },
      nested,
    );

    const ga4event = Object.assign(ga4purchase, { send_to: measurementId });

    expect(mockFn).toHaveBeenCalledWith('event', 'purchase', ga4event);
  });
});
