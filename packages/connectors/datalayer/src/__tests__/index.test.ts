/* eslint-disable prefer-rest-params */
import type { DataLayer } from '../types';
import { connectorDataLayer } from '..';

describe('connector dataLayer', () => {
  const mockPush = jest.fn();
  let dataLayer: DataLayer;

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer;
  });

  const gtag: Gtag.Gtag = function () {
    dataLayer.push(arguments);
  };

  test('init new', () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    connectorDataLayer(mockPush);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer!.length).toBe(0);
  });

  test('init existing', () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    connectorDataLayer(mockPush);
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config dataLayer', () => {
    const dataLayer: DataLayer = [];

    connectorDataLayer(mockPush, { dataLayer, name: 'foo' });
    expect(window.foo).toBeUndefined(); // Prefer dataLayer over name
    dataLayer.push({ event: 'foo' });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    connectorDataLayer(mockPush, { name: 'foo' });
    expect(Array.isArray(window.foo)).toBe(true);
  });

  test('original arguments', () => {
    connectorDataLayer(mockPush, { name: 'foo' });
    dataLayer.push('foo');
    expect(dataLayer).toEqual(['foo']);
  });

  test('push', () => {
    connectorDataLayer(mockPush);
    dataLayer!.push({ event: 'foo' });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ event: 'e a' }); // @TODO dummy
  });

  test('existing events', () => {
    dataLayer.push({ event: 'add_to_cart' });
    dataLayer.push({ event: 'purchase' });
    connectorDataLayer(mockPush);

    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  test('arguments', () => {
    dataLayer = [
      {
        'gtm.start': 1730909886667,
        event: 'gtm.js',
        'gtm.uniqueEventId': 1,
      },
      (function (...args: unknown[]) {
        return arguments || args;
      })('event', 'arg', {
        foo: 'bar',
      }),
    ];

    connectorDataLayer(mockPush, { dataLayer });

    gtag('event', 'another_arg', {
      bar: 'baz',
    });

    expect(mockPush).toHaveBeenCalledTimes(3);
    // @TODO check how mockPush has been called
  });

  test('mutation prevention', () => {
    const originalObj = {};
    const originalArr: unknown[] = [];

    mockPush.mockImplementation((...args) => {
      // Attempt to mutate the values
      args[0]['mutated'] = true;
      args[1].push('newElement');
    });

    connectorDataLayer(mockPush);
    dataLayer.push(originalObj, originalArr);
    expect(dataLayer[0]).toStrictEqual({});
    expect(dataLayer[1]).toStrictEqual([]);
    expect(originalObj).toEqual({});
    expect(originalArr).toEqual([]);
  });

  test('error handling', () => {
    const mockOrg = jest.fn();
    dataLayer.push = mockOrg;
    mockPush.mockImplementation(() => {
      throw new Error();
    });

    connectorDataLayer(mockPush);
    dataLayer.push('foo');
    expect(mockPush).toThrow();
    expect(mockOrg).toHaveBeenCalledTimes(1);
  });
});
