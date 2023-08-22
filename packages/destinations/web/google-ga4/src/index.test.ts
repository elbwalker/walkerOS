import webClient from '@elbwalker/walker.js';
import type { WebClient } from '@elbwalker/walker.js';
import type { Config, Function } from './types';

describe('Destination Google GA4', () => {
  const w = window;
  let elbwalker: WebClient.Function, destination: Function, config: Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'Entity Action';
  const eventName = 'entity_action';
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

    elbwalker = webClient({ pageview: false, version: 2 });
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

  test('Init with load script', () => {
    destination.config.loadScript = true;
    elbwalker.push('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    elbwalker.push(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('Debug mode', () => {
    config.custom!.debug = true;
    destination.config = config;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      eventName,
      expect.objectContaining({ debug_mode: true }),
    );
  });

  test('Disable pageview', () => {
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

    expect(mockFn).toHaveBeenCalledWith('event', eventName, {
      data_foo: 'bar',
      send_to: measurementId,
    });
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

    expect(mockFn).toHaveBeenCalledWith('event', eventName, expect.any(Object));
  });

  test('Parameters', () => {
    const config: Config = {
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
            name: 'mapped_ga4_params',
            custom: {
              params: {
                override: 'data.override',
                position: 'context.position.0',
                unavailable: { key: 'context.doesnt.exist', default: 'backup' },
                empty: 'context.not.there',
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
    elbwalker.push('walker config', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });
    const config: Config = {
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
    elbwalker.push('walker destination', destination, config);

    elbwalker.push('entity action', { foo: 'bar', override: 'foo' });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_action',
      expect.objectContaining({
        data_foo: 'foo', // Overwritten by params.data_foo with override
        globals_lang: 'de',
      }),
    );

    elbwalker.push('entity event', {}, trigger);
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

    elbwalker.push(
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
        source_type: expect.anything(),
        source_id: expect.any(String),
        source_previous_id: expect.any(String),
        user_id: 'us3r1d',
        version_config: 2,
        version_walker: expect.anything(),
      }),
    );

    elbwalker.push('entity none', { foo: 'bar' });
    expect(mockFn).toHaveBeenCalledWith('event', 'entity_none', {
      send_to: measurementId,
    });
  });

  test('Items', () => {
    const config: Config = {
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

  test('Snake case disabled', () => {
    const config: Config = {
      custom: { measurementId, snakeCase: false },
      init: true,
    };
    elbwalker.push('walker destination', destination, config);

    elbwalker.push('Original Case');

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'Original Case',
      expect.objectContaining({}),
    );
  });
});
