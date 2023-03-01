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

    // Bad configs
    elbwalker.push('walker destination', destination, {});
    elbwalker.push('walker destination', destination, { custom: {} });
    elbwalker.push('walker destination', destination, { custom: {} });
    elbwalker.push('walker destination', destination, { init: true });
    elbwalker.push('walker destination', destination, {
      custom: {},
      init: true,
    });

    // Regular config
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenCalledTimes(2);
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

  test('disable pageview', () => {
    config.custom!.pageview = false;
    destination.config = config;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockFn).toHaveBeenCalledWith(
      'config',
      measurementId,
      expect.objectContaining({ send_page_view: false }),
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

  test('Parameters', () => {
    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        params: {
          currency: { default: 'EUR', key: 'data.currency' },
          override: 'data.old', // override at event level
          user_id: 'user.id',
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
                timing: 'timing',
                lang: 'globals.lang',
              },
            },
          },
        },
      },
    };
    elbwalker.push('walker destination', destination, config);
    elbwalker.push('walker config', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });

    elbwalker.push(
      'ga4 params',
      { old: false, override: 'important' },
      trigger,
      { position: ['reco', 0] },
    );

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'ga4_params',
      expect.objectContaining({
        currency: 'EUR', // default value
        lang: 'de',
        override: 'important',
        position: 'reco',
        user_id: 'us3r1d',
        timing: expect.any(Number),
      }),
    );
  });

  test.only('Parameters include', () => {
    elbwalker.push('walker config', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });
    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        // include: ['data'], // Default behaviour
      },
      init: true,
      mapping: {
        entity: {
          action: {
            custom: {
              include: ['data', 'globals'],
              params: {
                // @TODO override
              },
            },
          },
        },
      },
    };
    elbwalker.push('walker destination', destination, config);

    elbwalker.push('entity action', { foo: 'bar' }, trigger, {
      position: ['reco', 0],
    });

    // @TODO override by explicit name
    // @TODO groups
    // @TODO all group
    // @TODO disable auto data include?

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity action',
      expect.objectContaining({
        data_foo: 'bar',
        globals_lang: 'de',
      }),
    );
  });

  test('Items', () => {
    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        params: {
          currency: { default: 'EUR', key: 'data.currency' },
          override: 'data.old', // override at event level
          value: 'data.revenue',
        },
      },
      init: true,
      mapping: {
        product: {
          add: {
            name: 'add_to_cart',
            custom: {
              items: {
                params: {
                  item_id: 'data.id',
                  item_category: 'data.category',
                  quantity: { default: 1, key: 'data.quantity' },
                },
              },
              params: { value: 'data.price' },
            },
          },
        },
        order: {
          complete: {
            name: 'purchase',
            custom: {
              items: {
                params: {
                  item_id: 'nested.*.data.id',
                },
              },
              params: { transaction_id: 'data.id' },
            },
          },
        },
      },
    };
    elbwalker.push('walker destination', destination, config);

    elbwalker.push('product add', {
      id: 'sku',
      category: 'Examples',
      currency: 'USD', // override default
      price: 7.77,
    });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'add_to_cart',
      expect.objectContaining({
        currency: 'USD',
        value: 7.77,
        items: [
          {
            item_id: 'sku',
            item_category: 'Examples',
            quantity: 1, // Event level default
          },
        ],
      }),
    );

    elbwalker.push(
      'order complete',
      { id: 'orderid', revenue: 25.42 },
      trigger,
      { key: ['value', 0] },
      [
        { type: 'product', data: { id: 'a' }, nested: [], context: {} },
        { type: 'product', data: { id: 'b' }, nested: [], context: {} },
      ],
    );

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        transaction_id: 'orderid',
        currency: 'EUR',
        value: 25.42,
        items: [{ item_id: 'a' }, { item_id: 'b' }],
      }),
    );
  });
});
