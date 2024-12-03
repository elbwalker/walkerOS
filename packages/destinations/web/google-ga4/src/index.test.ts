import { getEvent } from '@elbwalker/utils';
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
    const event = getEvent();
    const config: DestinationGoogleGA4.Config = {
      custom: { measurementId },
      init: true,
      mapping: {
        entity: {
          action: {
            name: 'parameters',
            data: {
              map: {
                currency: { value: 'EUR', key: 'data.currency' },
                user_id: 'user.id',
                value: 'data.revenue',
                position: 'context.dev.0',
                unavailable: {
                  key: 'context.does.not.exist',
                  value: 'backup',
                },
                empty: 'context.not.there',
                timing: 'timing',
                lang: 'globals.lang',
              },
            },
            custom: {
              include: [],
            },
          },
        },
      },
    };
    elb('walker destination', destination, config);
    elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'parameters',
      expect.objectContaining({
        currency: 'EUR', // default value
        lang: 'elb',
        position: 'test',
        unavailable: 'backup',
        user_id: 'us3r',
        timing: event.timing,
      }),
    );
  });

  test('Parameters include', () => {
    elb('walker run', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });
    config = {
      custom: { measurementId },
      init: true,
      mapping: {
        entity: {
          action: {
            data: {
              map: {
                data_foo: 'data.override',
              },
            },
            custom: {
              include: ['data', 'globals'],
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
        version_source: expect.any(String),
        version_tagging: 2,
      }),
    );

    elb('entity none', { foo: 'bar' });
    expect(mockFn).toHaveBeenCalledWith('event', 'entity_none', {
      send_to: measurementId,
    });
  });

  test('event add_to_cart', () => {
    const event = getEvent('product add');
    const config: DestinationGoogleGA4.Config = {
      custom: { measurementId },
      init: true,
      mapping: {
        product: {
          add: {
            name: 'add_to_cart',
            data: {
              map: {
                currency: { value: 'EUR', key: 'data.currency' },
                override: 'data.old',
                value: 'data.price',
                items: {
                  loop: [
                    'this',
                    {
                      map: {
                        item_id: 'data.id',
                        item_variant: 'data.color',
                        quantity: { value: 1, key: 'data.quantity' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };
    elb('walker destination', destination, config);

    elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'add_to_cart',
      expect.objectContaining({
        currency: 'EUR',
        value: event.data.price,
        items: [
          {
            item_id: event.data.id,
            item_variant: event.data.color,
            quantity: 1,
          },
        ],
      }),
    );
  });

  test('event purchase', () => {
    const event = getEvent('order complete');
    const config: DestinationGoogleGA4.Config = {
      custom: { measurementId },
      init: true,
      mapping: {
        order: {
          complete: {
            name: 'purchase',
            data: {
              map: {
                transaction_id: 'data.id',
                value: 'data.total',
                tax: 'data.taxes',
                shipping: 'data.shipping',
                currency: { key: 'data.currency', value: 'EUR' },
                items: {
                  loop: [
                    'nested',
                    {
                      condition: (entity) => entity.type === 'product',
                      map: {
                        item_id: 'data.id',
                        item_name: 'data.name',
                        quantity: { key: 'data.quantity', value: 1 },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };
    elb('walker destination', destination, config);

    elb(event);
    const product1 = event.nested[0].data;
    const product2 = event.nested[1].data;
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        transaction_id: event.data.id,
        value: event.data.total,
        tax: event.data.taxes,
        shipping: event.data.shipping,
        currency: 'EUR',
        items: [
          { item_id: product1.id, item_name: product1.name, quantity: 1 },
          { item_id: product2.id, item_name: product2.name, quantity: 1 },
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
