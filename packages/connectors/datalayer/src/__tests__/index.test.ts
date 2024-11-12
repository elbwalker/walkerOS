/* eslint-disable prefer-rest-params */
import type { DataLayer } from '../types';
import { connectorDataLayer } from '..';

describe('connector dataLayer', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
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

    connectorDataLayer();
    connectorDataLayer({});
    expect(window.dataLayer).toBeUndefined();

    connectorDataLayer({ elb });
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer!.length).toBe(0);
  });

  test('init existing', () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    connectorDataLayer({ elb });
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config dataLayer', () => {
    const dataLayer: DataLayer = [];

    connectorDataLayer({ elb, dataLayer, name: 'foo' });
    expect(window.foo).toBeUndefined(); // Prefer dataLayer over name
    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(1);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    connectorDataLayer({ elb, name: 'foo' });
    expect(Array.isArray(window.foo)).toBe(true);
  });

  test('original arguments', () => {
    connectorDataLayer({ elb, name: 'foo' });
    dataLayer.push('foo');
    expect(dataLayer).toEqual(['foo']);
  });

  test('push', () => {
    connectorDataLayer({ elb });
    dataLayer!.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(1);
    expect(elb).toHaveBeenCalledWith({
      event: 'foo',
      data: { id: expect.any(String) },
    });
  });

  test('existing events', () => {
    dataLayer.push({ event: 'add_to_cart' });
    dataLayer.push({ event: 'purchase' });
    connectorDataLayer({ elb });

    expect(elb).toHaveBeenCalledTimes(2);
  });

  test('arguments', () => {
    dataLayer = [
      {
        event: 'gtm.js',
        'gtm.start': 1730909886667,
        'gtm.uniqueEventId': 1,
      },
      (function (...args: unknown[]) {
        return arguments || args;
      })('event', 'arg', {
        // @TODO params not supported yet
        foo: 'bar',
      }),
    ];

    // mockPush.mockImplementation(console.log);

    connectorDataLayer({ elb, dataLayer });

    gtag('event', 'another_arg', {
      bar: 'baz',
    });

    expect(elb).toHaveBeenCalledTimes(3);
    expect(elb).toHaveBeenNthCalledWith(1, {
      event: 'gtm.js',
      data: {
        id: expect.any(String),
        'gtm.start': expect.any(Number),
        'gtm.uniqueEventId': 1,
      },
    });
    expect(elb).toHaveBeenNthCalledWith(2, {
      event: 'arg',
      data: { id: expect.any(String), foo: 'bar' },
    });
    expect(elb).toHaveBeenNthCalledWith(3, {
      event: 'another_arg',
      data: { id: expect.any(String), bar: 'baz' },
    });
  });

  test('mutation prevention', () => {
    const originalObj = {};
    const originalArr: unknown[] = [];

    elb.mockImplementation((...args) => {
      // Attempt to mutate the values
      args[0]['mutated'] = true;
      args[1].push('newElement');
    });

    connectorDataLayer(elb);
    dataLayer.push(originalObj, originalArr);
    expect(dataLayer[0]).toStrictEqual({});
    expect(dataLayer[1]).toStrictEqual([]);
    expect(originalObj).toEqual({});
    expect(originalArr).toEqual([]);
  });

  test('error handling', () => {
    const mockOrg = jest.fn();
    dataLayer.push = mockOrg;
    elb.mockImplementation(() => {
      throw new Error();
    });

    connectorDataLayer(elb);
    dataLayer.push('foo');
    expect(elb).toThrow();
    expect(mockOrg).toHaveBeenCalledTimes(1);
  });
});
