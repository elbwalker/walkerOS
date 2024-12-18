/* eslint-disable prefer-rest-params */
import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';
import { isArray } from '@elbwalker/utils';

describe('source dataLayer', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer as DataLayer;
  });

  const gtag: Gtag.Gtag = function () {
    dataLayer.push(arguments);
  };

  test('init new', () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    sourceDataLayer();
    sourceDataLayer({});
    expect(window.dataLayer).toBeUndefined();

    sourceDataLayer({ elb });
    expect(isArray(window.dataLayer)).toBe(true);
    expect((window.dataLayer as unknown as DataLayer)!.length).toBe(0);
  });

  test('init existing', () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    sourceDataLayer({ elb });
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config dataLayer', () => {
    const dataLayer: DataLayer = [];

    sourceDataLayer({ elb, dataLayer, name: 'foo' });
    expect(window.foo).toBeUndefined(); // Prefer dataLayer over name
    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(1);
  });

  test('config name', () => {
    expect(window.foo).toBeUndefined();

    sourceDataLayer({ elb, name: 'foo' });
    expect(isArray(window.foo)).toBe(true);
  });

  test('original arguments', () => {
    sourceDataLayer({ elb, name: 'foo' });
    dataLayer.push('foo');
    expect(dataLayer).toEqual(['foo']);
  });

  test('push', () => {
    sourceDataLayer({ elb });
    dataLayer.push({ event: 'foo' });
    expect(elb).toHaveBeenCalledTimes(1);
    expect(elb).toHaveBeenCalledWith({
      event: 'dataLayer foo',
      data: { event: 'foo' },
      id: expect.any(String),
      source: { type: 'dataLayer' },
    });
  });

  test('prefix', () => {
    sourceDataLayer({ elb, prefix: 'foo' });
    dataLayer.push({ event: 'bar baz' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'foo bar_baz',
      }),
    );
  });

  test('existing events', () => {
    dataLayer.push({ event: 'add_to_cart' });
    dataLayer.push({ event: 'purchase' });
    sourceDataLayer({ elb });

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
        foo: 'bar',
      }),
    ];

    sourceDataLayer({ elb, dataLayer });

    gtag('event', 'another_arg', {
      bar: 'baz',
    });

    expect(elb).toHaveBeenCalledTimes(3);
    expect(elb).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'dataLayer gtm.js',
        data: {
          event: 'gtm.js',
          'gtm.start': expect.any(Number),
          'gtm.uniqueEventId': 1,
        },
      }),
    );
    expect(elb).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'dataLayer arg',
        data: { event: 'arg', foo: 'bar' },
      }),
    );
    expect(elb).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'dataLayer another_arg',
        data: { event: 'another_arg', bar: 'baz' },
      }),
    );
  });

  test('mutation prevention', () => {
    const elb = jest.fn();
    const originalObj = {};
    const originalArr: unknown[] = [];

    elb.mockImplementation((...args) => {
      // Attempt to mutate the values
      args[0]['mutated'] = true;
      args[1].push('newElement');
    });

    sourceDataLayer({ elb });
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

    sourceDataLayer(elb);
    dataLayer.push('foo');
    expect(elb).toThrow();
    expect(mockOrg).toHaveBeenCalledTimes(1);
  });
});
