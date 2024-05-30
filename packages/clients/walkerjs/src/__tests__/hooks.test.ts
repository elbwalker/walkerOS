import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import type { WebClient, WebDestination } from '..';
import type { Hooks } from '@elbwalker/types';

describe('Hooks', () => {
  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    jest.useFakeTimers();
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);
  });

  test('Destinations', () => {
    // Destination mocks
    const mockInit = jest.fn().mockImplementation(() => {
      return true;
    });
    const mockPush = jest.fn();
    const destination: WebDestination.DestinationInit = {
      init: mockInit,
      push: mockPush,
    };

    const preDestinationInit = jest
      .fn()
      .mockImplementation(function (params, ...args) {
        return params.fn(...args);
      });
    const postDestinationInit = jest.fn().mockImplementation(function (params) {
      return params.result; // Return result from previous call
    });
    const preDestinationPush = jest.fn();
    const postDestinationPush = jest
      .fn()
      .mockImplementation(function (params, ...args) {
        return params.fn(...args);
      });

    walkerjs = Walkerjs({
      pageview: false,
      session: false,
    });

    elb('walker destination', destination);
    elb('walker run');

    elb('walker hook', 'preDestinationInit', preDestinationInit);
    elb('walker hook', 'postDestinationInit', postDestinationInit);
    elb('walker hook', 'preDestinationPush', preDestinationPush);
    elb('walker hook', 'postDestinationPush', postDestinationPush);

    expect(walkerjs.hooks).toEqual(
      expect.objectContaining({
        preDestinationInit: expect.any(Function),
        postDestinationInit: expect.any(Function),
        preDestinationPush: expect.any(Function),
        postDestinationPush: expect.any(Function),
      }),
    );

    elb('e a', { a: 1 }, 't', { c: ['v', 0] }, []);

    // Destination calls
    expect(mockInit).toHaveBeenCalledTimes(1);

    expect(preDestinationPush).toHaveBeenCalledWith(
      {
        fn: expect.any(Function),
        result: undefined,
      },
      expect.objectContaining({ event: 'e a' }), // event
      { init: true }, // destination config
      undefined, // custom event mapping
      expect.objectContaining({ allowed: true }), // walkerjs instance
    );
  });

  test('Push', () => {
    // Hook mocks
    const prePush = jest.fn().mockImplementation(function (params, ...args) {
      params.fn(...args); // Regular call
      return 'foo'; // Updated response
    });
    const postPush: Hooks.AnyFunction = jest.fn();

    walkerjs = Walkerjs({
      dataLayer: true,
      pageview: false,
      session: false,
      hooks: {
        prePush,
      },
    });

    elb('walker run');

    expect(prePush).toHaveBeenCalledTimes(1);
    elb('walker hook', 'postPush', postPush);
    expect(prePush).toHaveBeenCalledTimes(2);
    expect(prePush).toHaveBeenNthCalledWith(
      2,
      { fn: expect.any(Function) },
      'walker hook',
      'postPush',
      expect.any(Function),
    );

    expect(walkerjs.hooks).toEqual(
      expect.objectContaining({
        prePush: expect.any(Function),
        postPush: expect.any(Function),
      }),
    );

    (prePush as jest.Mock).mockClear();
    (postPush as jest.Mock).mockClear();

    elb('e a', { a: 1 }, 't', { c: ['v', 0] }, []);
    expect(prePush).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function), result: undefined },
      'e a',
      { a: 1 },
      't',
      { c: ['v', 0] },
      [],
    );
    expect(mockDataLayer).toHaveBeenCalledTimes(1);

    expect(postPush).toHaveBeenCalledTimes(1);
    expect(postPush).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function), result: 'foo' }, // with result
      'e a',
      { a: 1 },
      't',
      { c: ['v', 0] },
      [],
    );
  });

  test('SessionStart', () => {
    // Hook mocks
    const preSessionStart = jest
      .fn()
      .mockImplementation(function (params, ...args) {
        return params.fn(...args); // Regular call
      });
    const postSessionStart: Hooks.AnyFunction = jest.fn();

    walkerjs = Walkerjs({
      dataLayer: true,
      pageview: false,
      run: true,
      session: { storage: true },
      sessionStatic: { id: '1d' },
      hooks: {
        preSessionStart,
        postSessionStart,
      },
    });

    expect(preSessionStart).toHaveBeenCalledTimes(1);
    expect(preSessionStart).toHaveBeenCalledWith(
      {
        fn: expect.any(Function),
        result: undefined,
      },
      expect.objectContaining({ storage: true, data: { id: '1d' } }),
    );

    expect(postSessionStart).toHaveBeenCalledTimes(1);
    expect(postSessionStart).toHaveBeenCalledWith(
      {
        fn: expect.any(Function),
        result: expect.objectContaining({ storage: true, id: '1d' }),
      },
      expect.objectContaining({
        storage: true,
        isStart: true,
        instance: expect.any(Object),
        data: expect.any(Object),
        cb: expect.any(Function),
      }),
    );

    (preSessionStart as jest.Mock).mockClear();
    (postSessionStart as jest.Mock).mockClear();

    walkerjs.sessionStart();

    expect(preSessionStart).toHaveBeenCalledTimes(1);
    expect(postSessionStart).toHaveBeenCalledTimes(1);
  });
});
