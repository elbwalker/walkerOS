import type { DestinationGoogleGA4 } from '.';
import { elb, Walkerjs } from '@elbwalker/walker.js';

describe('Destination Google GA4', () => {
  const w = window;
  let destination: DestinationGoogleGA4.Destination,
    config: DestinationGoogleGA4.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'Entity Action';
  const eventName = 'entity_action';
  const data = { foo: 'bar' };
  const trigger = 'manual';
  const measurementId = 'G-XXXXXX-1';
  const server_container_url = 'https://server.example.com';
  const transport_url = 'https://collect.example.com';

  beforeEach(async () => {
    config = {
      custom: { measurementId },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    Walkerjs({ pageview: false, session: false, tagging: 2, run: true });
    w.gtag = mockFn;
  });

  test('Init', () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    destination.config = config;
    elb('walker destination', destination);
    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elb(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();

    expect((w.dataLayer as unknown[]).length).toBe(3);
  });

  test('Init calls', () => {
    destination.config = config;

    // Bad configs
    elb('walker destination', destination, {});
    elb('walker destination', destination, { custom: {} });
    elb('walker destination', destination, { custom: {} });
    elb('walker destination', destination, { init: true });
    elb('walker destination', destination, {
      custom: {},
      init: true,
    });

    // Regular config
    elb('walker destination', destination);

    elb(event);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', measurementId, {});
  });

  test('Init with load script', () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('Debug mode', () => {
    config.custom!.debug = true;
    destination.config = config;
    elb('walker destination', destination);
    elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      eventName,
      expect.objectContaining({ debug_mode: true }),
    );
  });

  test('Disable pageview', () => {
    config.custom!.pageview = false;
    destination.config = config;
    elb('walker destination', destination);
    elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'config',
      measurementId,
      expect.objectContaining({ send_page_view: false }),
    );
  });

  test('Push', () => {
    elb('walker destination', destination);
    elb(event, data, trigger);

    expect(mockFn).toHaveBeenCalledWith('event', eventName, {
      data_foo: 'bar',
      send_to: measurementId,
    });
  });

  test('Settings', () => {
    config.custom!.server_container_url = server_container_url;
    config.custom!.transport_url = transport_url;
    destination.config = config;

    elb('walker destination', destination);
    elb(event, data, trigger);

    Object.assign(data, { send_to: measurementId });

    expect(mockFn).toHaveBeenCalledWith('config', measurementId, {
      server_container_url,
      transport_url,
    });

    expect(mockFn).toHaveBeenCalledWith('event', eventName, expect.any(Object));
  });

  test('Parameters', () => {
    const config: DestinationGoogleGA4.Config = {
      custom: {
        measurementId,
        params: {
          currency: { value: 'EUR', key: 'data.currency' },
          override: 'data.old', // override at event level
          user_id: 'user.id',
          value: 'data.revenue',
        },
      },
      init: true,
      mapping: {
        ga4: {
          params: {
            name: 'mapped_ga4_params',
            custom: {
              include: [],
              params: {
                override: 'data.override',
                position: 'context.position.0',
                unavailable: {
                  key: 'context.does.not.exist',
                  value: 'backup',
                },
                empty: 'context.not.there',
                timing: 'timing',
                lang: 'globals.lang',
              },
            },
          },
        },
      },
    };
    elb('walker destination', destination, config);
    elb('walker run', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });

    elb({
      event: 'ga4 params',
      data: { old: false, override: 'important' },
      context: {
        position: ['reco', 0],
      },
      timing: 2,
    });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'mapped_ga4_params',
      expect.objectContaining({
        currency: 'EUR', // default value
        lang: 'de',
        override: 'important',
        position: 'reco',
        unavailable: 'backup',
        user_id: 'us3r1d',
        timing: expect.any(Number),
      }),
    );
  });

  test('Parameters include', () => {
    elb('walker run', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });
    config = {
      custom: {
        measurementId,
        // include: ['data'], // Default behavior
      },
      init: true,
      mapping: {
        entity: {
          action: {
            custom: {
              include: ['data', 'globals'],
              params: {
                data_foo: 'data.override',
              },
            },
          },
          all: { custom: { include: ['all'] } },
          event: { custom: { include: ['event'] } },
          none: { custom: { include: [] } },
        },
      },
    };
    elb('walker destination', destination, config);

    elb('entity action', { foo: 'bar', override: 'foo' });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_action',
      expect.objectContaining({
        data_foo: 'foo', // Overwritten by params.data_foo with override
        globals_lang: 'de',
      }),
    );

    elb('entity event', {}, trigger);
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_event',
      expect.objectContaining({
        event_id: expect.any(String),
        event_timing: expect.any(Number),
        event_trigger: trigger,
        event_entity: 'entity',
        event_action: 'event',
        event_group: expect.any(String),
        event_count: expect.any(Number),
      }),
    );

    elb(
      'entity all',
      { foo: 'bar' },
      trigger,
      {
        position: ['reco', 0],
      },
      [{ type: 'n', data: { k: 'v' }, nested: [], context: {} }],
    );
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_all',
      expect.objectContaining({
        context_position: 'reco',
        data_foo: 'bar',
        event_trigger: trigger,
        globals_lang: 'de',
        source_type: 'web',
        source_id: expect.any(String),
        source_previous_id: expect.any(String),
        user_id: 'us3r1d',
        version_tagging: 2,
        version_client: expect.any(String),
      }),
    );

    elb('entity none', { foo: 'bar' });
    expect(mockFn).toHaveBeenCalledWith('event', 'entity_none', {
      send_to: measurementId,
    });
  });

  test('Items', () => {
    config = {
      custom: {
        measurementId,
        params: {
          currency: { value: 'EUR', key: 'data.currency' },
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
              include: [],
              items: {
                params: {
                  item_id: 'data.id',
                  item_category: 'data.category',
                  quantity: { value: 1, key: 'data.quantity' },
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
                  item_index: 'nested.*.data.i',
                  item_coupon: 'data.coupon',
                },
              },
              params: { transaction_id: 'data.id' },
            },
          },
        },
      },
    };
    elb('walker destination', destination, config);

    elb('product add', {
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

    const coupon = 'S4L3';
    elb({
      event: 'order complete',
      data: { id: 'orderid', revenue: 25.42, coupon },
      nested: [
        { type: 'product', data: { id: 'a', i: 1 }, nested: [], context: {} },
        { type: 'product', data: { id: 'b' }, nested: [], context: {} },
        { type: 'product', data: { id: 'c', i: 2 }, nested: [], context: {} },
      ],
    });

    expect(mockFn).toHaveBeenLastCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        transaction_id: 'orderid',
        currency: 'EUR',
        value: 25.42,
        items: [
          { item_id: 'a', item_coupon: coupon, item_index: 1 },
          { item_id: 'b', item_coupon: coupon },
          { item_id: 'c', item_coupon: coupon, item_index: 2 },
        ],
      }),
    );
  });

  test('Snake case disabled', () => {
    config = {
      custom: { measurementId, snakeCase: false },
      init: true,
    };
    elb('walker destination', destination, config);

    elb('Original Case');

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'Original Case',
      expect.objectContaining({}),
    );
  });
});
