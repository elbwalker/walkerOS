import type { Elb } from '@walkerOS/web-collector';
import type { DestinationGA4 } from '.';
import { createWebCollector } from '@walkerOS/web-collector';
import { getEvent } from '@walkerOS/core';
import { events, mapping } from './examples';

describe('Destination Google GA4', () => {
  let elb: Elb.Fn;
  const w = window;
  let destination: DestinationGA4.Destination, config: DestinationGA4.Config;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = getEvent();
  const measurementId = 'G-XXXXXX-1';
  const server_container_url = 'https://server.example.com';
  const transport_url = 'https://collect.example.com';

  beforeEach(async () => {
    config = {
      settings: { measurementId, snakeCase: false },
    };

    destination = jest.requireActual('.').default;
    destination.config = config;

    ({ elb } = createWebCollector({
      pageview: false,
      session: false,
      tagging: 2,
      run: true,
    }));
    w.gtag = mockFn;
  });

  test('init', async () => {
    (w.dataLayer as unknown) = undefined;
    (w.gtag as unknown) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    destination.config = config;
    elb('walker destination', destination);
    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    await elb(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();

    expect((w.dataLayer as unknown[]).length).toBe(3);
  });

  test('init calls', async () => {
    destination.config = config;

    // Bad configs
    elb('walker destination', destination, {});
    elb('walker destination', destination, { settings: {} });
    elb('walker destination', destination, { settings: {} });
    elb('walker destination', destination, { init: true });
    elb('walker destination', destination, {
      settings: {},
      init: true,
    });

    // Regular config
    elb('walker destination', destination);

    await elb(event);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', measurementId, {});
  });

  test('fn', async () => {
    (w.gtag as unknown) = undefined;
    const fn = jest.fn();
    destination.config.fn = fn;
    elb('walker destination', destination);
    await elb(event);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('init with load script', async () => {
    destination.config.loadScript = true;
    elb('walker destination', destination);

    const scriptSelector = `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`;

    let elem = document.querySelector(scriptSelector);
    expect(elem).not.toBeTruthy();

    await elb(event);

    elem = document.querySelector(scriptSelector);
    expect(elem).toBeTruthy();
  });

  test('debug mode', async () => {
    destination.config.settings!.debug = true;
    elb('walker destination', destination);
    await elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      event.event,
      expect.objectContaining({ debug_mode: true }),
    );
  });

  test('disable pageview', async () => {
    config.settings!.pageview = false;
    destination.config = config;
    elb('walker destination', destination);
    await elb(event);

    expect(mockFn).toHaveBeenCalledWith(
      'config',
      measurementId,
      expect.objectContaining({ send_page_view: false }),
    );
  });

  test('push', async () => {
    elb('walker destination', destination);
    await elb(getEvent('entity action', { data: { foo: 'bar' } }));

    expect(mockFn).toHaveBeenCalledWith('event', event.event, {
      data_foo: 'bar',
      send_to: measurementId,
    });
  });

  test('settings', async () => {
    elb('walker destination', destination, {
      settings: {
        measurementId,
        server_container_url,
        transport_url,
      },
    });
    await elb(event);

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

  test('parameters', async () => {
    const event = getEvent();
    const config: DestinationGA4.Config = {
      settings: { measurementId },
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
            settings: { include: [] },
          },
        },
      },
    };
    elb('walker destination', destination, config);
    await elb(event);

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

  test('parameters include', async () => {
    elb('walker run', {
      globals: { lang: 'de' },
      user: { id: 'us3r1d' },
    });
    config = {
      settings: { measurementId },
      init: true,
      mapping: {
        entity: {
          action: {
            data: {
              map: {
                data_foo: 'data.override',
              },
            },
            settings: {
              include: ['data', 'globals'],
            },
          },
          all: { settings: { include: ['all'] } },
          event: { settings: { include: ['event'] } },
          none: { settings: { include: [] } },
        },
      },
    };
    elb('walker destination', destination, config);

    await elb('entity action', { foo: 'bar', override: 'foo' });

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'entity_action',
      expect.objectContaining({
        data_foo: 'foo', // Overwritten by params.data_foo with override
        globals_lang: 'de',
      }),
    );

    await elb(getEvent('entity event'));
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
    await elb(entity_all);
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

    await elb('entity none', { foo: 'bar' });
    expect(mockFn).toHaveBeenCalledWith('event', 'entity_none', {
      send_to: measurementId,
    });
  });

  test('event add_to_cart', async () => {
    const event = getEvent('product add');

    const config: DestinationGA4.Config = {
      settings: { measurementId, include: [] },
      init: true,
      mapping: mapping.config,
    };
    elb('walker destination', destination, config);

    await elb(event);

    expect(mockFn).toHaveBeenCalledWith(...events.add_to_cart());
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');

    const config: DestinationGA4.Config = {
      settings: { measurementId, include: [] },
      init: true,
      mapping: mapping.config,
    };
    elb('walker destination', destination, config);

    await elb(event);
    expect(mockFn).toHaveBeenCalledWith(...events.purchase());
  });

  test('snake case disabled', async () => {
    config = {
      settings: { measurementId, snakeCase: false },
      init: true,
    };
    elb('walker destination', destination, config);

    await elb('Original Case');

    expect(mockFn).toHaveBeenCalledWith(
      'event',
      'Original Case',
      expect.objectContaining({}),
    );
  });
});
