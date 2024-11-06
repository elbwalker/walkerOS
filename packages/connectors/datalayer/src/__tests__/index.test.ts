import type { DataLayer } from '../types';
import { elbDataLayer } from '..';

describe('connector dataLayer', () => {
  const mockPush = jest.fn();
  let dataLayer: DataLayer;

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer;
  });

  test('init new', () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    elbDataLayer(mockPush);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer!.length).toBe(0);
  });

  test('init existing', () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    elbDataLayer(mockPush);
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    elbDataLayer(mockPush, { name: 'foo' });
    expect(Array.isArray(window.foo)).toBe(true);
  });

  test('original arguments', () => {
    elbDataLayer(mockPush, { name: 'foo' });
    dataLayer.push('foo');
    expect(dataLayer).toEqual(['foo']);
  });

  test('push', () => {
    elbDataLayer(mockPush);
    window.dataLayer!.push('foo');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ event: 'e a' }); // @TODO dummy
  });

  test('error handling', () => {
    const mockOrg = jest.fn();
    dataLayer.push = mockOrg;
    mockPush.mockImplementation(() => {
      throw new Error();
    });

    elbDataLayer(mockPush);
    window.dataLayer!.push('foo');
    expect(mockPush).toThrow();
    expect(mockOrg).toHaveBeenCalledTimes(1);
  });
});
