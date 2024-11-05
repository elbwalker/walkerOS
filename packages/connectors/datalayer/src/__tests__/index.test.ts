import type { DataLayer } from '../types';
import { elbDataLayer } from '..';

describe('connector datalayer', () => {
  let dataLayer: DataLayer;
  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer;
  });

  test('init new', () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    elbDataLayer();
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer!.length).toBe(0);
  });

  test('init existing', () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    elbDataLayer();
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    elbDataLayer({ name: 'foo' });
    expect(Array.isArray(window.foo)).toBe(true);
  });

  test('original arguments', () => {
    elbDataLayer({ name: 'foo' });
    dataLayer.push('foo');
    expect(dataLayer).toEqual(['foo']);
  });
});
