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
      data: {},
      id: expect.any(String),
      source: { type: 'dataLayer' },
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

    connectorDataLayer({ elb, dataLayer });

    gtag('event', 'another_arg', {
      bar: 'baz',
    });

    expect(elb).toHaveBeenCalledTimes(3);
    expect(elb).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'gtm.js',
        data: {
          'gtm.start': expect.any(Number),
          'gtm.uniqueEventId': 1,
        },
      }),
    );
    expect(elb).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'arg',
        data: { foo: 'bar' },
      }),
    );
    expect(elb).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'another_arg',
        data: { bar: 'baz' },
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

    connectorDataLayer({ elb });
    dataLayer.push(originalObj, originalArr);
    expect(dataLayer[0]).toStrictEqual({});
    expect(dataLayer[1]).toStrictEqual([]);
    expect(originalObj).toEqual({});
    expect(originalArr).toEqual([]);
  });

  test('duplicate prevention', () => {
    const processedEvents = new Set<string>();
    processedEvents.add('foo');
    connectorDataLayer({ elb, processedEvents });

    dataLayer.push({ event: 'foo', id: 'foo' });
    expect(elb).toHaveBeenCalledTimes(0);

    dataLayer.push({ event: 'bar', id: 'bar' });
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'bar',
        id: 'bar',
      }),
    );
    expect(elb).toHaveBeenCalledTimes(1);

    dataLayer.push({ event: 'foo', id: 'bar' });
    expect(elb).toHaveBeenCalledTimes(1);

    processedEvents.delete('foo');
    dataLayer.push({ event: 'foo', id: 'foo' });
    expect(elb).toHaveBeenCalledTimes(2);

    expect(processedEvents.has('foo')).toBeTruthy();
    expect(processedEvents.has('bar')).toBeTruthy();
    expect(processedEvents.size).toBe(2);
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
