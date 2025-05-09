import type { DataLayer } from '../types';
import { sourceDataLayer } from '..';
import { isArray, isObject } from '@elbwalker/utils';

describe('source dataLayer', () => {
  const elb = jest.fn(); //.mockImplementation(console.log);
  let dataLayer: DataLayer;

  const gtag: Gtag.Gtag = function () {
    dataLayer.push(arguments);
  };

  beforeEach(() => {
    window.dataLayer = [];
    dataLayer = window.dataLayer as DataLayer;
  });

  test('init new', async () => {
    window.dataLayer = undefined;
    expect(window.dataLayer).toBeUndefined();

    sourceDataLayer();
    sourceDataLayer({});
    await jest.runAllTimersAsync();
    expect(window.dataLayer).toBeUndefined();

    sourceDataLayer({ elb });
    await jest.runAllTimersAsync();
    expect(isArray(window.dataLayer)).toBe(true);
    expect((window.dataLayer as unknown as DataLayer).length).toBe(0);
  });

  test('init existing', async () => {
    const originalPush = dataLayer.push;
    expect(originalPush).toBe(dataLayer.push);

    sourceDataLayer({ elb });
    await jest.runAllTimersAsync();
    expect(originalPush).not.toBe(dataLayer!.push);
  });

  test('config name', async () => {
    expect(window.foo).toBeUndefined();

    sourceDataLayer({ elb, name: 'foo' });
    await jest.runAllTimersAsync();
    expect(isArray(window.foo)).toBe(true);
  });

  test('original arguments', async () => {
    sourceDataLayer({ elb, name: 'foo' });
    dataLayer.push('foo');
    await jest.runAllTimersAsync();
    expect(dataLayer).toEqual(['foo']);
  });

  test('filter', async () => {
    const mockFn = jest.fn();
    sourceDataLayer({
      elb,
      filter: (event) => {
        mockFn(event);
        return isObject(event) && event.event === 'foo';
      },
    });

    let event = { event: 'foo' };
    dataLayer.push(event);
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledTimes(0);
    expect(mockFn).toHaveBeenCalledWith(event);

    event = { event: 'bar' };
    dataLayer.push(event);
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(event);
  });

  test('prefix', async () => {
    sourceDataLayer({ elb, prefix: 'foo' });
    dataLayer.push({ event: 'bar baz' });
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'foo bar_baz',
      }),
    );
  });

  test('existing events', async () => {
    dataLayer.push({ event: 'add_to_cart' });
    dataLayer.push({ event: 'purchase' });
    sourceDataLayer({ elb });
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledTimes(2);
  });

  test('arguments', async () => {
    window.dataLayer = [
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

    // Reassign the dataLayer to the window.dataLayer
    dataLayer = window.dataLayer as DataLayer;

    sourceDataLayer({ elb });
    await jest.runAllTimersAsync();

    gtag('event', 'another_arg', { bar: 'baz' });
    await jest.runAllTimersAsync();

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

  test('processing', async () => {
    const loopFn = jest.fn().mockImplementation(() => {
      // Create an infinite loop
      dataLayer.push({ event: 'loop' });
    });

    dataLayer.push({ event: 'foo' });
    dataLayer.push({ event: 'bar' });

    const source = await sourceDataLayer({ elb: loopFn });
    await jest.runAllTimersAsync();

    dataLayer.push({ event: 'baz' });
    await jest.runAllTimersAsync();

    expect(JSON.stringify(dataLayer)).toBe(
      JSON.stringify([
        { event: 'foo' },
        { event: 'bar' },
        { event: 'loop' },
        { event: 'loop' },
        { event: 'baz' },
        { event: 'loop' },
      ]),
    );

    expect(JSON.stringify(source!.skipped)).toBe(
      JSON.stringify([{ event: 'loop' }, { event: 'loop' }, { event: 'loop' }]),
    );

    expect(loopFn).toHaveBeenCalledTimes(3);
    expect(loopFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: 'dataLayer foo' }),
    );
    expect(loopFn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: 'dataLayer bar' }),
    );
    expect(loopFn).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ event: 'dataLayer baz' }),
    );
  });

  test('mutation prevention', async () => {
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

  test('error handling', async () => {
    const mockOrg = jest.fn();
    dataLayer.push = mockOrg;
    elb.mockImplementation(() => {
      throw new Error();
    });

    const source = await sourceDataLayer({ elb });
    dataLayer.push({ event: 'foo' });
    await jest.runAllTimersAsync();

    expect(elb).toThrow();
    expect(mockOrg).toHaveBeenCalledTimes(1);
    expect(source?.processing).toBe(false);
  });

  test('failing filter', async () => {
    const filterFn = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error();
      })
      .mockImplementation(() => false);

    const source = await sourceDataLayer({ elb, filter: filterFn });
    dataLayer.push({ event: 'foo' });

    await jest.runAllTimersAsync();
    expect(filterFn).toHaveBeenCalledTimes(1);
    expect(elb).toHaveBeenCalledTimes(0);

    dataLayer.push({ event: 'bar' });
    await jest.runAllTimersAsync();
    expect(elb).toHaveBeenCalledTimes(1);

    expect(source?.processing).toBe(false);
  });
});
