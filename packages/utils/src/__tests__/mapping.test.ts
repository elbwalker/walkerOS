import { Mapping, WalkerOS } from '@walkerOS/types';
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
        { event: 'page view' },
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
        { event: 'page random' },
        { page: { '*': entityAsterisksConfig } },
      ),
    ).toStrictEqual({
      eventMapping: entityAsterisksConfig,
      mappingKey: 'page *',
    });

    const asterisksActionConfig = { name: '*_view' };
    expect(
      await getMappingEvent(
        { event: 'random view' },
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
      await getMappingEvent({ event: 'not existing' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'asterisk' },
      mappingKey: '* *',
    });

    expect(
      await getMappingEvent({ event: 'asterisk action' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'action' },
      mappingKey: '* action',
    });

    expect(
      await getMappingEvent({ event: 'foo something' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'foo_asterisk' },
      mappingKey: 'foo *',
    });

    expect(
      await getMappingEvent({ event: 'bar something' }, mapping),
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
      await getMappingEvent({ event: 'order complete' }, mapping),
    ).toStrictEqual({
      eventMapping: mapping.order!.complete[1],
      mappingKey: 'order complete',
    });

    expect(
      await getMappingEvent(
        { event: 'order complete', globals: { env: 'prod' } },
        mapping,
      ),
    ).toStrictEqual({
      eventMapping: mapping.order!.complete[0],
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
        type: 'child',
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
    const pageView = createEvent({ event: 'page view' });
    const pageClick = createEvent({ event: 'page click' });

    const mockFn = jest.fn((event) => {
      if (event.event === 'page view') return 'foo';
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
              isObject(entity) && entity.type === 'product',
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
            key: 'event',
          },
        ],
      }),
    ).toStrictEqual([event.event]);
  });

  test('set', async () => {
    const event = getEvent('order complete');

    expect(
      await getMappingValue(event, {
        set: ['event', 'data', { value: 'static' }, { fn: () => 'fn' }],
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
    } as unknown as WalkerOS.Collector;

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
      return event.event === 'page view';
    });

    // Condition met
    expect(
      await getMappingValue(createEvent({ event: 'page view' }), {
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
      { condition: (event) => event.event === 'no pe' },
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
