import { WalkerOS } from '@elbwalker/types';
import { createEvent, getEventConfig, getMappingValue } from '../core';

describe('mapping', () => {
  test('getEventConfig', () => {
    const pageViewConfig = { name: 'page_view' };

    expect(
      getEventConfig('page view', { page: { view: pageViewConfig } }),
    ).toStrictEqual({
      eventConfig: pageViewConfig,
      mappingKey: 'page view',
    });

    const entityAsterisksConfig = { name: 'entity_*' };
    expect(
      getEventConfig('page random', { page: { '*': entityAsterisksConfig } }),
    ).toStrictEqual({
      eventConfig: entityAsterisksConfig,
      mappingKey: 'page *',
    });

    const asterisksActionConfig = { name: '*_view' };
    expect(
      getEventConfig('random view', { '*': { view: asterisksActionConfig } }),
    ).toStrictEqual({
      eventConfig: asterisksActionConfig,
      mappingKey: '* view',
    });
  });

  test('string', () => {
    const event = createEvent();
    expect(getMappingValue(event, 'timing')).toBe(event.timing);
    // expect(getMappingValue(event, 'data')).toBe(event.data); // @TODO
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
});
