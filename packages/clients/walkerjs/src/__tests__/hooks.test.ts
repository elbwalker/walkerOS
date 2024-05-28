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

    walkerjs = Walkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
  });

  test('hooks', () => {
    // Destination mocks
    const mockInit = jest.fn().mockImplementation(() => {
      return true;
    });
    const mockPush = jest.fn();
    const destination: WebDestination.Destination = {
      config: {},
      init: mockInit,
      push: mockPush,
    };

    // Hook mocks
    const prePush = jest.fn().mockImplementation(function (params, ...args) {
      mockDataLayer(...args); // Custom code
      params.fn(...args); // Regular call
      return 'foo'; // Updated response
    });
    const postPush: Hooks.AnyFunction = jest.fn();
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
      hooks: {
        prePush,
      },
    });

    elb('walker destination', destination);
    elb('walker run');

    (prePush as jest.Mock).mockClear();

    elb('walker hook', 'postPush', postPush);
    elb('walker hook', 'preDestinationInit', preDestinationInit);
    elb('walker hook', 'postDestinationInit', postDestinationInit);
    elb('walker hook', 'preDestinationPush', preDestinationPush);
    elb('walker hook', 'postDestinationPush', postDestinationPush);

    expect(prePush).toHaveBeenCalledTimes(5); // 5 hook pushes
    expect(prePush).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function) },
      'walker hook',
      'postPush',
      expect.any(Function),
    );

    expect(walkerjs.hooks).toEqual(
      expect.objectContaining({
        prePush: expect.any(Function),
        postPush: expect.any(Function),
        preDestinationInit: expect.any(Function),
        postDestinationInit: expect.any(Function),
        preDestinationPush: expect.any(Function),
        postDestinationPush: expect.any(Function),
      }),
    );

    (prePush as jest.Mock).mockClear();
    (postPush as jest.Mock).mockClear();
    (preDestinationPush as jest.Mock).mockClear();

    elb('e a', { a: 1 }, 't', { c: ['v', 0] }, []);

    // Destination calls
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);

    expect(prePush).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function), result: undefined },
      'e a',
      { a: 1 },
      't',
      { c: ['v', 0] },
      [],
    );

    expect(preDestinationPush).toHaveBeenNthCalledWith(
      1,
      {
        fn: expect.any(Function),
        result: undefined,
      },
      expect.objectContaining({ event: 'e a' }), // event
      { init: true }, // destination config
      undefined, // custom event mapping
      expect.objectContaining({ allowed: true }), // walkerjs instance
    );

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
});
