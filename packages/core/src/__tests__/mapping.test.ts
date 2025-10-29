import type { Mapping, WalkerOS, Collector } from '../types';
import {
  createEvent,
  getEvent,
  getMappingEvent,
  getMappingValue,
  isObject,
  isString,
} from '..';

describe('getMappingEvent', () => {
  test('basic', async () => {
    const pageViewConfig = { name: 'page_view' };

    expect(
      await getMappingEvent(
        { name: 'page view' },
        { page: { view: pageViewConfig } },
      ),
    ).toStrictEqual({
      eventMapping: pageViewConfig,
      mappingKey: 'page view',
    });
  });

  test('asterisk', async () => {
    const entityAsterisksConfig = { name: 'entity_*' };
    expect(
      await getMappingEvent(
        { name: 'page random' },
        { page: { '*': entityAsterisksConfig } },
      ),
    ).toStrictEqual({
      eventMapping: entityAsterisksConfig,
      mappingKey: 'page *',
    });

    const asterisksActionConfig = { name: '*_view' };
    expect(
      await getMappingEvent(
        { name: 'random view' },
        { '*': { view: asterisksActionConfig } },
      ),
    ).toStrictEqual({
      eventMapping: asterisksActionConfig,
      mappingKey: '* view',
    });

    const mapping = {
      '*': {
        '*': { name: 'asterisk' },
        action: { name: 'action' },
      },
      foo: { '*': { name: 'foo_asterisk' } },
      bar: { baz: { name: 'irrelevant' } },
    };

    expect(
      await getMappingEvent({ name: 'not existing' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'asterisk' },
      mappingKey: '* *',
    });

    expect(
      await getMappingEvent({ name: 'asterisk action' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'action' },
      mappingKey: '* action',
    });

    expect(
      await getMappingEvent({ name: 'foo something' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'foo_asterisk' },
      mappingKey: 'foo *',
    });

    expect(
      await getMappingEvent({ name: 'bar something' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'asterisk' },
      mappingKey: '* *',
    });
  });

  test('condition', async () => {
    const mapping: Mapping.Rules = {
      order: {
        complete: [
          {
            condition: (event) =>
              isObject(event) &&
              isObject(event.globals) &&
              event.globals.env === 'prod',
            ignore: true,
          },
          {
            name: 'purchase',
          },
        ],
      },
    };

    expect(
      await getMappingEvent({ name: 'order complete' }, mapping),
    ).toStrictEqual({
      eventMapping: (mapping.order!.complete as Array<Mapping.Rule>)[1],
      mappingKey: 'order complete',
    });

    expect(
      await getMappingEvent(
        { name: 'order complete', globals: { env: 'prod' } },
        mapping,
      ),
    ).toStrictEqual({
      eventMapping: (mapping.order!.complete as Array<Mapping.Rule>)[0],
      mappingKey: 'order complete',
    });
  });
});

describe('getMappingValue', () => {
  test('string', async () => {
    const event = createEvent();
    expect(await getMappingValue(event, 'timing')).toBe(event.timing);
    expect(await getMappingValue(event, 'data')).toBe(event.data);
    expect(await getMappingValue(event, 'data.string')).toBe(event.data.string);
    expect(await getMappingValue(event, 'context.dev.0')).toBe(
      event.context.dev![0],
    );
    expect(await getMappingValue(event, 'globals.lang')).toBe(
      event.globals.lang,
    );
  });

  test('nested', async () => {
    const event = createEvent();
    expect(await getMappingValue(event, 'nested.0.data.is')).toBe(
      event.nested[0].data.is,
    );
    expect(await getMappingValue(event, 'nested.*.data.is')).toStrictEqual([
      event.nested[0].data.is,
    ]);

    function getNested(data: WalkerOS.Properties) {
      return {
        entity: 'child',
        data,
        nested: [],
        context: { element: ['child', 0] },
      } as WalkerOS.Entity;
    }
    const nested = [
      getNested({ a: 'foo' }),
      getNested({}),
      getNested({ a: 'bar' }),
    ];
    expect(
      await getMappingValue({ nested } as WalkerOS.Event, {
        key: 'nested.*.data.a',
      }),
    ).toStrictEqual(['foo', undefined, 'bar']);
  });

  test('key default', async () => {
    const event = createEvent();

    expect(
      await getMappingValue(event, { key: 'data.string', value: 'static' }),
    ).toBe(event.data.string);

    expect(
      await getMappingValue(event, {
        key: 'does.not.exist',
        value: 'fallback',
      }),
    ).toBe('fallback');

    expect(await getMappingValue(event, { value: 'static' })).toBe('static');
  });

  test('value', async () => {
    expect(await getMappingValue({}, { value: 'static' })).toBe('static');
    expect(await getMappingValue({}, { value: 0 })).toBe(0);
    expect(await getMappingValue({}, { value: false })).toBe(false);
  });

  test('empty', async () => {
    expect(
      await getMappingValue(createEvent(), {
        map: {
          set: { set: [{}] },
          map: {},
          loop: [],
        },
      }),
    ).toEqual({ map: undefined, set: [undefined], loop: undefined });
  });

  test('false', async () => {
    expect(await getMappingValue(createEvent(), 'data.array.2')).toBe(false);
  });

  test('fn', async () => {
    const pageView = createEvent({ name: 'page view' });
    const pageClick = createEvent({ name: 'page click' });

    const mockFn = jest.fn((event) => {
      if (event.name === 'page view') return 'foo';
      return 'bar';
    });

    expect(await getMappingValue(pageView, { fn: mockFn })).toBe('foo');
    expect(await getMappingValue(pageClick, { fn: mockFn })).toBe('bar');
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Props
    await getMappingValue(pageClick, { fn: mockFn }, { props: 'random' });

    expect(mockFn).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      { fn: mockFn },
      { props: 'random', consent: pageClick.consent },
    );
  });

  test('loop', async () => {
    const event = getEvent('order complete');

    expect(
      await getMappingValue(event, {
        loop: [
          'nested',
          {
            condition: (entity) =>
              isObject(entity) && entity.entity === 'product',
            key: 'data.name',
          },
        ],
      }),
    ).toStrictEqual([event.nested[0].data.name, event.nested[1].data.name]);

    expect(
      await getMappingValue(event, {
        loop: [
          'this',
          {
            key: 'name',
          },
        ],
      }),
    ).toStrictEqual([event.name]);
  });

  test('set', async () => {
    const event = getEvent('order complete');

    expect(
      await getMappingValue(event, {
        set: ['name', 'data', { value: 'static' }, { fn: () => 'fn' }],
      }),
    ).toStrictEqual(['order complete', event.data, 'static', 'fn']);
  });

  test('map', async () => {
    const event = createEvent();

    expect(
      await getMappingValue(event, {
        map: {
          foo: 'data.string',
          bar: { value: 'bar' },
          data: {
            map: {
              recursive: { value: true },
            },
          },
        },
      }),
    ).toStrictEqual({
      foo: event.data.string,
      bar: 'bar',
      data: { recursive: true },
    });
  });

  test('validate', async () => {
    const event = createEvent();
    const mockValidate = jest.fn(isString);

    // validation passed
    expect(
      await getMappingValue(event, {
        key: 'data.string',
        validate: mockValidate,
      }),
    ).toBe(event.data.string);

    // validation failed
    expect(
      await getMappingValue(event, {
        key: 'data.number',
        validate: mockValidate,
      }),
    ).toBeUndefined();

    // Use value as a fallback
    expect(
      await getMappingValue(event, {
        key: 'data.number',
        validate: mockValidate,
        value: 'fallback',
      }),
    ).toBe('fallback');
  });

  test('values', async () => {
    expect(
      await getMappingValue(
        { arr: [1, 'foo', false] },
        {
          loop: [
            'arr',
            {
              fn: (i: unknown) => {
                return i;
              },
            },
          ],
        },
      ),
    ).toStrictEqual([1, 'foo', false]);

    expect(await getMappingValue('string')).toBeUndefined();
  });

  test('consent', async () => {
    const collector = {
      consent: { collectorLevel: true },
    } as unknown as Collector.Instance;

    expect(collector.consent.collectorLevel).toBeTruthy();

    // Denied
    expect(
      await getMappingValue(
        { foo: 'bar' },
        {
          key: 'foo',
          consent: { notGranted: true },
        },
      ),
    ).toBeUndefined();

    // eventsLevel
    expect(
      await getMappingValue(
        { foo: 'bar', consent: { eventLevel: true } },
        {
          key: 'foo',
          consent: { eventLevel: true },
        },
        { collector },
      ),
    ).toBe('bar');

    // optionsLevel
    expect(
      await getMappingValue(
        { foo: 'bar' },
        { key: 'foo', consent: { optionsLevel: true } },
        { consent: { optionsLevel: true } },
      ),
    ).toBe('bar');

    // collectorLevel
    expect(
      await getMappingValue(
        { foo: 'bar' },
        {
          key: 'foo',
          consent: { collectorLevel: true },
        },
        { collector },
      ),
    ).toBe('bar');

    // eventsLevel override optionsLevel
    expect(
      await getMappingValue(
        { foo: 'bar', consent: { eventLevel: false } },
        { key: 'foo', consent: { eventLevel: true } },
        { collector },
      ),
    ).toBeUndefined();

    // eventLevel overrides collectorLevel
    expect(
      await getMappingValue(
        { foo: 'bar', consent: { collectorLevel: false } },
        {
          key: 'foo',
          consent: { collectorLevel: true },
        },
        { collector },
      ),
    ).toBeUndefined();

    // optionsLevel overrides collectorLevel
    expect(
      await getMappingValue(
        { foo: 'bar' },
        { key: 'foo', consent: { collectorLevel: true } },
        { collector, consent: { optionsLevel: false } },
      ),
    ).toBeUndefined();
  });

  test('condition', async () => {
    const mockCondition = jest.fn((event) => {
      return event.name === 'page view';
    });

    // Condition met
    expect(
      await getMappingValue(createEvent({ name: 'page view' }), {
        key: 'data.string',
        condition: mockCondition,
      }),
    ).toEqual(expect.any(String));

    // Condition not met
    expect(
      await getMappingValue(createEvent(), {
        key: 'data.string',
        condition: mockCondition,
        value: 'fallback', // Should not be used
      }),
    ).toBeUndefined();
  });

  test('mapping array', async () => {
    const event = createEvent();
    const mockFn = jest.fn();

    const mappings = [
      {
        condition: (event: unknown) =>
          isObject(event) && 'event' in event && event.event === 'no pe',
      },
      'non.existing.key',
      { key: 'data.string' },
      { fn: mockFn },
    ];

    expect(await getMappingValue(event, mappings)).toBe(event.data.string);
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('error functions', async () => {
    const mockErrorFn = jest.fn(() => {
      throw new Error('test');
    });

    expect(
      await getMappingValue(createEvent(), { fn: mockErrorFn }),
    ).toBeUndefined();
    expect(
      await getMappingValue(createEvent(), { condition: mockErrorFn }),
    ).toBeUndefined();
    expect(
      await getMappingValue(createEvent(), { validate: mockErrorFn }),
    ).toBeUndefined();
  });
});

describe('processEventMapping', () => {
  const { processEventMapping } = require('..');

  const mockCollector = {
    consent: {},
  } as unknown as Collector.Instance;

  test('config-level policy', async () => {
    const event = { name: 'page view', data: { title: 'Home' } };
    const config = {
      policy: {
        'data.normalized': { value: true },
        'data.title': {
          fn: (e: unknown) =>
            isObject(e) && isObject(e.data) && isString(e.data.title)
              ? e.data.title.toUpperCase()
              : undefined,
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.event.data.normalized).toBe(true);
    expect(result.event.data.title).toBe('HOME');
    expect(result.ignore).toBe(false);
  });

  test('event-level policy', async () => {
    const event = { name: 'product view', data: { id: 'P123' } };
    const config = {
      mapping: {
        product: {
          view: {
            policy: {
              'data.tracked': { value: true },
              'data.id': {
                fn: (e: unknown) =>
                  isObject(e) && isObject(e.data) && isString(e.data.id)
                    ? `PRODUCT_${e.data.id}`
                    : undefined,
              },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.event.data.tracked).toBe(true);
    expect(result.event.data.id).toBe('PRODUCT_P123');
    expect(result.ignore).toBe(false);
  });

  test('config-level policy applied before event-level policy', async () => {
    const event = {
      name: 'order complete',
      data: { total: 100 },
    };

    const config = {
      policy: {
        'data.configLevel': { value: 'config' },
        'data.total': {
          fn: (e: unknown) =>
            isObject(e) && isObject(e.data) && typeof e.data.total === 'number'
              ? e.data.total * 2
              : undefined,
        },
      },
      mapping: {
        order: {
          complete: {
            policy: {
              'data.eventLevel': { value: 'event' },
              'data.total': {
                fn: (e: unknown) =>
                  isObject(e) &&
                  isObject(e.data) &&
                  typeof e.data.total === 'number'
                    ? e.data.total + 50
                    : undefined,
              },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    // Config policy runs first: 100 * 2 = 200
    // Event policy runs second: 200 + 50 = 250
    expect(result.event.data.total).toBe(250);
    expect(result.event.data.configLevel).toBe('config');
    expect(result.event.data.eventLevel).toBe('event');
  });

  test('event-level policy with wildcard mapping', async () => {
    const event = { name: 'product click', data: {} };
    const config = {
      mapping: {
        product: {
          '*': {
            policy: {
              'data.wildcardApplied': { value: true },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.event.data.wildcardApplied).toBe(true);
  });

  test('event-level policy with conditional mapping', async () => {
    const highValueEvent = {
      name: 'order complete',
      data: { value: 100 },
    };
    const lowValueEvent = {
      name: 'order complete',
      data: { value: 10 },
    };

    const config = {
      mapping: {
        order: {
          complete: [
            {
              condition: (event: unknown) =>
                isObject(event) &&
                isObject(event.data) &&
                typeof event.data.value === 'number' &&
                event.data.value > 50,
              policy: {
                'data.tier': { value: 'premium' },
              },
            },
            {
              policy: {
                'data.tier': { value: 'standard' },
              },
            },
          ],
        },
      },
    };

    const highResult = await processEventMapping(
      highValueEvent,
      config,
      mockCollector,
    );
    const lowResult = await processEventMapping(
      lowValueEvent,
      config,
      mockCollector,
    );

    expect(highResult.event.data.tier).toBe('premium');
    expect(lowResult.event.data.tier).toBe('standard');
  });

  test('policy does not interfere with name override and ignore', async () => {
    const event = { name: 'product view', data: {} };
    const config = {
      policy: {
        'data.configModified': { value: true },
      },
      mapping: {
        product: {
          view: {
            name: 'product_viewed',
            policy: {
              'data.eventModified': { value: true },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    // Policies should be applied
    expect(result.event.data.configModified).toBe(true);
    expect(result.event.data.eventModified).toBe(true);

    // Name should be overridden (happens after policy)
    expect(result.event.name).toBe('product_viewed');

    // Should not be ignored
    expect(result.ignore).toBe(false);
  });

  test('event-level policy with ignore flag', async () => {
    const event = { name: 'test event', data: {} };
    const config = {
      mapping: {
        test: {
          event: {
            ignore: true,
            policy: {
              'data.modified': { value: true },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    // Policy should still be applied before ignore
    expect(result.event.data.modified).toBe(true);

    // Event should be ignored
    expect(result.ignore).toBe(true);
  });

  test('policy with no mapping rules', async () => {
    const event = { name: 'unmapped event', data: {} };
    const config = {
      policy: {
        'data.modified': { value: true },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    expect(result.event.data.modified).toBe(true);
    expect(result.eventMapping).toBeUndefined();
    expect(result.ignore).toBe(false);
  });

  test('event-level policy modifies event before data transformation', async () => {
    const event = {
      name: 'user login',
      user: { email: 'john@example.com' },
    };

    const config = {
      mapping: {
        user: {
          login: {
            policy: {
              'user.email': {
                fn: (e: unknown) =>
                  isObject(e) && isObject(e.user) && isString(e.user.email)
                    ? e.user.email.toLowerCase()
                    : undefined,
              },
            },
            data: {
              map: {
                email: 'user.email',
              },
            },
          },
        },
      },
    };

    const result = await processEventMapping(event, config, mockCollector);

    // Policy modifies the event
    expect(result.event.user.email).toBe('john@example.com');

    // Data transformation uses the modified event
    expect(result.data).toEqual({ email: 'john@example.com' });
  });
});
