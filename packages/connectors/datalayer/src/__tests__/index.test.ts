import { elbDataLayer } from '..';
// import type { ConnectorDatalayer } from '..';

describe('connector datalayer', () => {
  beforeEach(() => {
    window.dataLayer = undefined;
  });

  test('init', () => {
    expect(window.dataLayer).toBeUndefined();

    elbDataLayer();
    expect(window.dataLayer).toEqual([]);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    elbDataLayer({ name: 'foo' });
    expect(window.foo).toEqual([]);
  });
});
