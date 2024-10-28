import { getEventConfig } from '../core';

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
});
