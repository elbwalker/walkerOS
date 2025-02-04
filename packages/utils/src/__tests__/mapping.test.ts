import { Mapping, WalkerOS } from '@elbwalker/types';
import {
  createEvent,
  getEvent,
  getMappingEvent,
  getMappingValue,
  isObject,
  isString,
} from '../core';

describe('getMappingEvent', () => {
  test('basic', () => {
    const pageViewConfig = { name: 'page_view' };

    expect(
      getMappingEvent(
        { event: 'page view' },
        { page: { view: pageViewConfig } },
      ),
    ).toStrictEqual({
      eventMapping: pageViewConfig,
      mappingKey: 'page view',
    });
  });

  test('asterisk', () => {
    const entityAsterisksConfig = { name: 'entity_*' };
    expect(
      getMappingEvent(
        { event: 'page random' },
        { page: { '*': entityAsterisksConfig } },
      ),
    ).toStrictEqual({
      eventMapping: entityAsterisksConfig,
      mappingKey: 'page *',
    });

    const asterisksActionConfig = { name: '*_view' };
    expect(
      getMappingEvent(
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

    expect(getMappingEvent({ event: 'not existing' }, mapping)).toStrictEqual({
      eventMapping: { name: 'asterisk' },
      mappingKey: '* *',
    });

    expect(
      getMappingEvent({ event: 'asterisk action' }, mapping),
    ).toStrictEqual({
      eventMapping: { name: 'action' },
      mappingKey: '* action',
    });

    expect(getMappingEvent({ event: 'foo something' }, mapping)).toStrictEqual({
      eventMapping: { name: 'foo_asterisk' },
      mappingKey: 'foo *',
    });

    expect(getMappingEvent({ event: 'bar something' }, mapping)).toStrictEqual({
      eventMapping: { name: 'asterisk' },
      mappingKey: '* *',
    });
  });

  test('condition', () => {
    const mapping: Mapping.Config = {
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

    expect(getMappingEvent({ event: 'order complete' }, mapping)).toStrictEqual(
      {
        eventMapping: mapping.order!.complete[1],
        mappingKey: 'order complete',
      },
    );

    expect(
      getMappingEvent(
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
  test('string', () => {
    const event = createEvent();
    expect(getMappingValue(event, 'timing')).toBe(event.timing);
    expect(getMappingValue(event, 'data')).toBe(event.data);
    expect(getMappingValue(event, 'data.string')).toBe(event.data.string);
    expect(getMappingValue(event, 'context.dev.0')).toBe(event.context.dev![0]);
    expect(getMappingValue(event, 'globals.lang')).toBe(event.globals.lang);
  });

  test('nested', () => {
    const event = createEvent();
    expect(getMappingValue(event, 'nested.0.data.is')).toBe(
      event.nested[0].data.is,
    );
    expect(getMappingValue(event, 'nested.*.data.is')).toStrictEqual([
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
      getMappingValue({ nested } as WalkerOS.Event, {
        key: 'nested.*.data.a',
      }),
    ).toStrictEqual(['foo', undefined, 'bar']);
  });

  test('key default', () => {
    const event = createEvent();

    expect(
      getMappingValue(event, { key: 'data.string', value: 'static' }),
    ).toBe(event.data.string);

    expect(
      getMappingValue(event, { key: 'does.not.exist', value: 'fallback' }),
    ).toBe('fallback');

    expect(getMappingValue(event, { value: 'static' })).toBe('static');
  });

  test('empty', () => {
    const event = createEvent();
    expect(getMappingValue(event)).toStrictEqual(event);
  });

  test('false', () => {
    expect(getMappingValue(createEvent(), 'data.array.2')).toBe(false);
  });

  test('fn', () => {
    const mockFn = jest.fn((event) => {
      if (event.event === 'page view') return 'foo';
      return 'bar';
    });

    expect(
      getMappingValue(createEvent({ event: 'page view' }), {
        fn: mockFn,
      }),
    ).toBe('foo');
    expect(
      getMappingValue(createEvent({ event: 'page click' }), {
        fn: mockFn,
      }),
    ).toBe('bar');
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Props
    getMappingValue(
      createEvent({ event: 'page click' }),
      { fn: mockFn },
      { props: 'random' },
    );

    expect(mockFn).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      { fn: mockFn },
      { props: 'random' },
    );
  });

  test('loop', () => {
    const event = getEvent('order complete');

    expect(
      getMappingValue(event, {
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
      getMappingValue(event, {
        loop: [
          'this',
          {
            key: 'event',
          },
        ],
      }),
    ).toStrictEqual([event.event]);
  });

  test('set', () => {
    const event = getEvent('order complete');

    expect(
      getMappingValue(event, {
        set: ['event', 'data', { value: 'static' }, { fn: () => 'fn' }],
      }),
    ).toStrictEqual(['order complete', event.data, 'static', 'fn']);
  });

  test('map', () => {
    const event = createEvent();

    expect(
      getMappingValue(event, {
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

  test('validate', () => {
    const event = createEvent();
    const mockValidate = jest.fn(isString);

    // validation passed
    expect(
      getMappingValue(event, {
        key: 'data.string',
        validate: mockValidate,
      }),
    ).toBe(event.data.string);

    // validation failed
    expect(
      getMappingValue(event, {
        key: 'data.number',
        validate: mockValidate,
      }),
    ).toBeUndefined();

    // Use value as a fallback
    expect(
      getMappingValue(event, {
        key: 'data.number',
        validate: mockValidate,
        value: 'fallback',
      }),
    ).toBe('fallback');
  });

  test('values', () => {
    expect(
      getMappingValue(
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

    expect(getMappingValue('string')).toEqual('string');
    expect(getMappingValue(1)).toEqual(1);
  });

  test('consent', () => {
    const event = createEvent({ consent: { functional: true } });
    const instance = {
      consent: { functional: true },
    } as unknown as WalkerOS.Instance;

    // Granted
    expect(
      getMappingValue(
        event,
        {
          key: 'data.string',
          consent: { functional: true },
        },
        { instance },
      ),
    ).toBe(event.data.string);

    // Denied
    expect(
      getMappingValue(
        event,
        {
          key: 'data.string',
          consent: { marketing: true },
        },
        { instance },
      ),
    ).toBeUndefined();

    // Denied automatically if no instance is provided
    expect(
      getMappingValue(event, {
        key: 'data.string',
        consent: { functional: true },
      }),
    ).toBeUndefined();
  });

  test('condition', () => {
    const mockCondition = jest.fn((event) => {
      return event.event === 'page view';
    });

    // Condition met
    expect(
      getMappingValue(createEvent({ event: 'page view' }), {
        key: 'data.string',
        condition: mockCondition,
      }),
    ).toEqual(expect.any(String));

    // Condition not met
    expect(
      getMappingValue(createEvent(), {
        key: 'data.string',
        condition: mockCondition,
        value: 'fallback', // Should not be used
      }),
    ).toBeUndefined();
  });

  test('mapping array', () => {
    const event = createEvent();
    const mockFn = jest.fn();

    const mappings = [
      { condition: (event) => event.event === 'no pe' },
      'non.existing.key',
      { key: 'data.string' },
      { fn: mockFn },
    ];

    expect(getMappingValue(event, mappings)).toBe(event.data.string);
    expect(mockFn).not.toHaveBeenCalled();
  });
});
