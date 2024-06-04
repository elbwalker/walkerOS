import type { WebClient } from '..';
import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { sessionStart } from '@elbwalker/utils';

jest.mock('@elbwalker/utils', () => {
  const utilsOrg = jest.requireActual('@elbwalker/utils');

  return {
    ...utilsOrg,
    sessionStart: jest.fn().mockImplementation(utilsOrg.sessionStart),
  };
});

let walkerjs: WebClient.Instance;

describe('On Consent', () => {
  beforeEach(() => {
    walkerjs = Walkerjs({
      consent: { automatically: true },
      default: true,
    });
  });

  test('basics', () => {
    const mockFn = jest.fn();

    // Don't call on default
    elb('walker on', 'consent', { marketing: mockFn });
    expect(mockFn).not.toHaveBeenCalled();

    // Different consent group
    elb('walker consent', { functional: true });
    expect(mockFn).not.toHaveBeenCalled();

    // Granted
    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Denied
    elb('walker consent', { marketing: false });
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('consent register', () => {
    const mockFn = jest.fn();
    elb('walker on', 'consent', { foo: mockFn });
    expect(walkerjs.on.consent![0].foo).toBe(mockFn);
  });

  test('consent by start', () => {
    const mockFn = jest.fn();
    Walkerjs({
      consent: { foo: false },
      on: { consent: [{ foo: mockFn }] },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent already granted', () => {
    const mockFn = jest.fn();
    Walkerjs({
      consent: { foo: false },
      on: { consent: [{ foo: mockFn }] },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent call on register', () => {
    const mockFn = jest.fn();
    elb('walker on', 'consent', { automatically: mockFn });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent parameters', () => {
    const mockFn = jest.fn();
    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalledWith(walkerjs, {
      automatically: true,
    });
  });

  // test for normal behavior if error is thrown
  test('consent error', () => {
    const mockFn = jest.fn(() => {
      throw new Error('kaputt');
    });
    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockDataLayer).toHaveBeenCalledTimes(2); // session start and page view only
  });

  test('multiple functions', () => {
    const mockFnA = jest.fn();
    const mockFnB = jest.fn();
    const mockFnC = jest.fn();
    elb('walker on', 'consent', [
      { automatically: mockFnA },
      { automatically: mockFnB },
    ]);

    expect(walkerjs.on.consent).toHaveLength(2);
    expect(mockFnA).toHaveBeenCalledTimes(1);
    expect(mockFnB).toHaveBeenCalledTimes(1);
    // Add a new function
    jest.clearAllMocks();
    elb('walker on', 'consent', { automatically: mockFnC });
    expect(walkerjs.on.consent).toHaveLength(3);
    expect(mockFnA).toHaveBeenCalledTimes(0);
    expect(mockFnB).toHaveBeenCalledTimes(0);
    expect(mockFnC).toHaveBeenCalledTimes(1);

    // Update consent
    jest.clearAllMocks();
    elb('walker consent', { automatically: false });
    expect(mockFnA).toHaveBeenCalledTimes(1);
    expect(mockFnB).toHaveBeenCalledTimes(1);
    expect(mockFnC).toHaveBeenCalledTimes(1);
  });

  test('update', () => {
    const mockFnA = jest.fn();
    const mockFnB = jest.fn();

    elb('walker on', 'consent', [{ a: mockFnA }, { b: mockFnB }]);

    elb('walker consent', { a: true });
    expect(mockFnA).toHaveBeenCalledTimes(1);
    expect(mockFnB).toHaveBeenCalledTimes(0);

    jest.clearAllMocks();
    elb('walker consent', { b: true });
    expect(mockFnA).toHaveBeenCalledTimes(0);
    expect(mockFnB).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    elb('walker consent', { c: true });
    expect(mockFnA).toHaveBeenCalledTimes(0);
    expect(mockFnB).toHaveBeenCalledTimes(0);
  });
});

describe('On Run', () => {
  beforeEach(() => {
    walkerjs = Walkerjs();
  });

  test('basics', () => {
    const mockFn = jest.fn();

    // Don't call on default
    elb('walker on', 'run', mockFn);
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb('walker run');
    expect(mockFn).toHaveBeenCalledTimes(1); // only once
  });

  test('run with state', () => {
    elb('walker run', { group: 'gr0up1d', round: 5 });

    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        group: 'gr0up1d',
        round: 6,
      }),
    );
  });

  test('run register', () => {
    const mockFn = jest.fn();
    elb('walker on', 'run', mockFn);
    elb('walker run');
    expect(walkerjs.on.run![0]).toBe(mockFn);
  });

  test('run register init', () => {
    const mockFn = jest.fn();
    Walkerjs({
      on: { run: [mockFn] },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('run register after run', () => {
    const mockFnPre = jest.fn();
    const mockFnPost = jest.fn();
    elb('walker on', 'run', mockFnPre);
    expect(mockFnPre).toHaveBeenCalledTimes(0);
    walkerjs = Walkerjs();
    expect(mockFnPre).toHaveBeenCalledTimes(0);
    elb('walker run');
    expect(mockFnPre).toHaveBeenCalledTimes(1);

    expect(mockFnPost).toHaveBeenCalledTimes(0);
    elb('walker on', 'run', mockFnPost);
    expect(mockFnPost).toHaveBeenCalledTimes(1);
  });

  test('run register elbLayer', () => {
    const mockFn = jest.fn();
    Walkerjs({
      on: { run: [mockFn] },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent error', () => {
    const mockFn = jest.fn();
    const mockBrokenFn = jest.fn(() => {
      throw new Error('kaputt');
    });
    Walkerjs({
      on: { run: [mockBrokenFn, mockFn] },
      default: true,
    });
    expect(mockBrokenFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('run multiple', () => {
    const mockFn = jest.fn();
    elb('walker on', 'run', mockFn);
    elb('walker run');
    elb('walker run');
    elb('walker run');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe('On Ready', () => {
  const mockFn = jest.fn();
  const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);
  let events: Record<string, EventListenerOrEventListenerObject> = {};
  let addEventListener: typeof document.addEventListener;
  let readyState: DocumentReadyState;

  beforeEach(() => {
    jest.clearAllMocks();
    events = {};
    readyState = document.readyState;
    addEventListener = document.addEventListener;
    document.addEventListener = mockAddEventListener.mockImplementation(
      (event, callback) => {
        events[event] = callback;
      },
    );
  });

  afterEach(() => {
    document.addEventListener = addEventListener;
    Object.defineProperty(document, 'readyState', {
      value: readyState,
      writable: true,
    });
  });

  test('ready on load', () => {
    Walkerjs({ run: true, on: { ready: [mockFn] } });
    const mockFnOn = jest.fn();
    elb('walker on', 'ready', mockFnOn);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFnOn).toHaveBeenCalledTimes(1);
  });

  test('ready later', () => {
    readyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    Walkerjs({ run: true, on: { ready: [mockFn] } });
    const mockFnOn = jest.fn();
    elb('walker on', 'ready', mockFnOn);

    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockFnOn).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as () => void)();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFnOn).toHaveBeenCalledTimes(1);
  });
});

describe('On Session', () => {
  const mockFn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register', () => {
    walkerjs = Walkerjs({ run: true, on: { session: [mockFn] } });
    const mockFnOn = jest.fn();
    elb('walker on', 'session', mockFnOn);

    expect(walkerjs.on.session![0]).toBe(mockFn);
    expect(walkerjs.on.session![1]).toBe(mockFnOn);
  });

  test('session disabled', () => {
    walkerjs = Walkerjs({
      run: true,
      session: false,
      on: { session: [mockFn] },
    });
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test('basics', () => {
    walkerjs = Walkerjs({ run: true });
    elb('walker on', 'session', mockFn);
    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('async with storage', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({
      run: true,
      session: { consent: 'marketing', storage: true },
      on: { session: [mockFn] },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('async with custom cb', () => {
    const mockCb = jest.fn();
    walkerjs = Walkerjs({
      run: true,
      session: { cb: mockCb, consent: 'marketing', storage: true },
      on: { session: [mockFn] },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledTimes(1);
  });

  test('async with disabled cb', () => {
    walkerjs = Walkerjs({
      run: true,
      session: { cb: false, consent: 'marketing', storage: true },
      on: { session: [mockFn] },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
