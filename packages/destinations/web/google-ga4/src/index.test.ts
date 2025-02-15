import { getEvent } from '@elbwalker/utils';
import type { DestinationGoogleGA4 } from '.';
import { elb, Walkerjs } from '@elbwalker/walker.js';

describe('Destination Google GA4', () => {
  const w = window;
  let destination: DestinationGoogleGA4.Destination,
    config: DestinationGoogleGA4.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const measurementId = 'G-XXXXXX-1';
  const server_container_url = 'https://server.example.com';
  const transport_url = 'https://collect.example.com';

  beforeEach(async () => {
    config = {
      custom: { measurementId, snakeCase: false },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    Walkerjs({ pageview: false, session: false, tagging: 2, run: true });
    w.gtag = mockFn;
  });

  test('init', () => {
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

  test('init calls', () => {
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

  test('fn', () => {
    (w.gtag as unknown) = undefined;
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    elb(event);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('init with load script', () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('debug mode', () => {
    destination.config.custom!.debug = true;
    elb('walker destination', destination);
    elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      event.event,
      expect.objectContaining({ debug_mode: true }),
    );
  });

  test('disable pageview', () => {
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

  test('push', () => {
    elb('walker destination', destination);
    elb(getEvent('entity action', { data: { foo: 'bar' } }));

    expect(mockFn).toHaveBeenCalledWith('event', event.event, {
      data_foo: 'bar',
      send_to: measurementId,
    });
  });

  test('dataLayer source', () => {
    elb('walker destination', destination);
    elb(event);
    jest.resetAllMocks();

    elb(getEvent('entity action', { source: { type: 'dataLayer' } }));
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb(getEvent('entity action', { source: { type: 'web' } }));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('settings', () => {
    elb('walker destination', destination, {
      custom: {
        measurementId,
        server_container_url,
        transport_url,
      },
    });
    elb(event);

    expect(mockFn).toHaveBeenCalledWith('config', measurementId, {
      server_container_url,
      transport_url,
    });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_action',
      expect.any(Object),
    );
  });

  test('parameters', () => {
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

  test('parameters include', () => {
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

    elb(getEvent('entity event'));
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_event',
      expect.objectContaining({
        event_id: expect.any(String),
        event_timing: expect.any(Number),
        event_trigger: event.trigger,
        event_entity: 'entity',
        event_action: 'event',
        event_group: expect.any(String),
        event_count: expect.any(Number),
      }),
    );

    const entity_all = getEvent('entity all');
    elb(entity_all);
    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_all',
      expect.objectContaining({
        data_string: entity_all.data.string,
        data_boolean: entity_all.data.boolean,
        data_number: entity_all.data.number,
        data_array: entity_all.data.array,
        context_dev: entity_all.context.dev![0],
        globals_lang: entity_all.globals.lang,
        user_id: entity_all.user.id,
        user_device: entity_all.user.device,
        user_session: entity_all.user.session,
        event_id: entity_all.id,
        event_trigger: entity_all.trigger,
        event_entity: entity_all.entity,
        event_action: entity_all.action,
        event_timing: entity_all.timing,
        event_group: entity_all.group,
        event_count: entity_all.count,
        version_source: entity_all.version.source,
        version_tagging: entity_all.version.tagging,
        source_id: entity_all.source.id,
        source_previous_id: entity_all.source.previous_id,
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

  test('snake case disabled', () => {
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
