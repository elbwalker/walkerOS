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

  test('getMappingValue string', () => {
    const event = createEvent();
    expect(getMappingValue(event, 'data.string')).toBe(event.data.string);
    expect(getMappingValue(event, 'context.dev.0')).toBe(event.context.dev![0]);
    expect(getMappingValue(event, 'globals.lang')).toBe(event.globals.lang);
    expect(getMappingValue(event, 'nested.0.data.is')).toBe(
      event.nested[0].data.is,
    );
    expect(getMappingValue(event, 'nested.*.data.is')).toBe(
      event.nested[0].data.is,
    );
  });

  test('getMappingValue key default', () => {
    const event = createEvent();
    expect(
      getMappingValue(event, { key: 'data.string', default: 'static' }),
    ).toBe(event.data.string);
    expect(getMappingValue(event, { default: 'static' })).toBe('static');
  });
});
