import { elb, Walkerjs } from '..';
import type { WebClient, WebDestination } from '..';
import type { Data, Hooks } from '@elbwalker/types';
import fs from 'fs';

describe('Elbwalker', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);
  const version = { client: expect.any(String), tagging: expect.any(Number) };

  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    jest.clearAllMocks();
    jest.resetModules();
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;

    walkerjs = Walkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
    });
  });

  test('go', () => {
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;
    expect(window.elbLayer).toBeUndefined();
    const instance = Walkerjs();
    expect(instance.config.elbLayer).toBeDefined();
  });

  test('assign to window', () => {
    const w = window as unknown as Record<string, unknown>;
    expect(window.elb).toBeUndefined();
    expect(window.walkerjs).toBeUndefined();
    const instance = Walkerjs({
      elb: 'foo',
      instance: 'bar',
    });
    expect(w.foo).toBe(elb);
    expect(w.bar).toBe(instance);
  });

  test('empty push', () => {
    (walkerjs as unknown as string[]).push();
    elb('');
    elb('entity');
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test('regular push', () => {
    elb('walker run');

    elb('entity action');
    elb('entity action', { foo: 'bar' });

    expect(mockFn).toHaveBeenNthCalledWith(1, {
      event: 'entity action',
      data: expect.any(Object),
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version,
      source: {
        type: 'web',
        id: 'http://localhost/',
        previous_id: '',
      },
      walker: true,
    });

    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      data: { foo: 'bar' },
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      source: {
        type: 'web',
        id: 'http://localhost/',
        previous_id: '',
      },
      walker: true,
    });
  });

  test('globals properties', () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/globals.html')
      .toString();
    document.body.innerHTML = html;

    jest.clearAllMocks(); // skip previous init
    w.elbLayer = [];
    walkerjs = Walkerjs({
      default: true,
      pageview: false,
      globals: { out_of: 'override', static: 'value' },
    });

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { out_of: 'scope', static: 'value' },
      }),
    );

    jest.clearAllMocks(); // skip previous init
    elb('walker run');
    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { out_of: 'scope', static: 'value' },
      }),
    );
  });

  test('group ids', () => {
    elb('entity action');
    elb('entity action');
    const groupId = mockFn.mock.calls[0][0].group;
    expect(mockFn.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elb('walker run');
    elb('entity action');
    expect(mockFn.mock.calls[2][0].group).not.toEqual(groupId); // page view
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
      mockFn(...args); // Custom code
      params.fn(...args); // Regular call
      return 'foo'; // Updated response
    });
    const postPush: Hooks.Function = jest.fn();
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
      undefined,
      undefined,
      undefined,
    );

    expect(walkerjs.config.hooks).toEqual(
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
      undefined,
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
      undefined,
    );
  });

  test('source', () => {
    const location = document.location;
    const referrer = document.referrer;

    const newPageId = 'https://www.elbwalker.com/source_id';
    const newPageReferrer = 'https://another.elbwalker.com';
    Object.defineProperty(window, 'location', {
      value: new URL(newPageId),
      writable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: newPageReferrer,
      writable: true,
    });

    elb('entity source');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'entity source',
        source: {
          type: 'web',
          id: newPageId,
          previous_id: newPageReferrer,
        },
      }),
    );

    window.location = location;
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('walker commands', () => {
    mockFn.mockClear();
    elb('walker action');

    // don't push walker commands to destinations
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('walker user', () => {
    elb('walker run');

    // Missing argument
    elb('walker user');
    elb('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: {},
      }),
    );

    elb('walker user', { id: 'userId' });
    elb('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId' },
      }),
    );

    elb('walker user', { device: 'userId' });
    elb('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId' },
      }),
    );

    elb('walker user', { session: 'sessionid' });
    elb('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userId', device: 'userId', session: 'sessionid' },
      }),
    );
  });

  test('walker consent', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({
      consent: { functional: true },
      default: true,
      pageview: false,
    });

    elb('walker run');

    expect(walkerjs.config.consent.functional).toBeTruthy();
    expect(walkerjs.config.consent.marketing).not.toBeTruthy();
    elb('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true },
      }),
    );

    // Missing argument
    elb('walker consent');
    expect(walkerjs.config.consent.functional).toBeTruthy();
    expect(walkerjs.config.consent.marketing).not.toBeTruthy();

    // Grant permissions
    elb('walker consent', { marketing: true });
    expect(walkerjs.config.consent.marketing).toBeTruthy();
    elb('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: true },
      }),
    );

    // Revoke permissions
    elb('walker consent', { marketing: false });
    expect(walkerjs.config.consent.marketing).not.toBeTruthy();
    elb('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: false },
      }),
    );
  });

  test('timing', () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.advanceTimersByTime(2500); // 2.5 sec load time
    walkerjs = Walkerjs({ default: true });

    expect(mockFn.mock.calls[0][0].timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    elb('walker run');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 0,
      }),
    ); // Start from 0 not 3.5

    jest.advanceTimersByTime(5000); // wait 5 sec
    elb('e a');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 5,
      }),
    );
  });

  test('Element parameter', () => {
    document.body.innerHTML = `
      <div data-elbcontext="c:o">
        <div id="e" data-elb="e" data-elbaction="load">
          <p data-elb-e="k:v"></p>
        </div>
      </div>
    `;
    const elem = document.getElementById('e') as HTMLElement;

    elb('e custom', elem, 'custom');

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e custom',
        trigger: 'custom',
        data: { k: 'v' },
        context: { c: ['o', 0] },
      }),
    );

    elb('e context', { a: 1 }, 'custom', elem);

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e context',
        trigger: 'custom',
        data: { a: 1 },
        context: { c: ['o', 0] },
      }),
    );
  });

  // @TODO move to somewhere else
  test('Contract', () => {
    const contract: Data.Contract = {
      version: '',
      globals: {
        pagegroup: {
          type: 'string',
          values: [2, '2', []],
        },
        pagetype: {},
      },
      context: {},
      entities: {},
    };

    expect(contract).toBeDefined();
  });
});
