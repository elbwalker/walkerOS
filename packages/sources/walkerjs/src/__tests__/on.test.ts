import type { SourceWalkerjs, DestinationWeb } from '..';
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

const mockFn = jest.fn();
const mockOnConsent = jest.fn();
const mockOnReady = jest.fn();
const mockOnRun = jest.fn();
const mockOnSession = jest.fn();

let walkerjs: SourceWalkerjs.Instance;
const destination: DestinationWeb.Destination = {
  config: {
    on: {
      consent: [{ marketing: mockOnConsent }],
      ready: [mockOnReady],
      run: [mockOnRun],
      session: [mockOnSession],
    },
  },
  push: jest.fn(),
};

describe('On Consent', () => {
  beforeEach(() => {
    walkerjs = Walkerjs({
      consent: { automatically: true },
      default: true,
      destinations: { destination },
    });
  });

  test('basics', () => {
    // Don't call on default
    elb('walker on', 'consent', { marketing: mockFn });
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockOnConsent).not.toHaveBeenCalled();

    // Different consent group
    elb('walker consent', { functional: true });
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockOnConsent).not.toHaveBeenCalled();

    // Granted
    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnConsent).toHaveBeenCalledTimes(1);

    // Denied
    elb('walker consent', { marketing: false });
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockOnConsent).toHaveBeenCalledTimes(2);
  });

  test('consent register', () => {
    elb('walker on', 'consent', { marketing: mockFn });
    expect(walkerjs.on.consent![0].marketing).toBe(mockFn);
  });

  test('consent by start', () => {
    Walkerjs({
      consent: { marketing: false },
      on: { consent: [{ marketing: mockFn }] },
      default: true,
      destinations: { destination },
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnConsent).toHaveBeenCalledTimes(1);
  });

  test('consent already granted', () => {
    Walkerjs({
      consent: { marketing: false },
      on: { consent: [{ marketing: mockFn }] },
      default: true,
      destinations: { destination },
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnConsent).toHaveBeenCalledTimes(1);
  });

  test('consent call on register', () => {
    elb('walker on', 'consent', { automatically: mockFn });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent parameters', () => {
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
    walkerjs = Walkerjs({ destinations: { destination } });
  });

  test('basics', () => {
    // Don't call on default
    elb('walker on', 'run', mockFn);
    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockOnRun).toHaveBeenCalledTimes(0);

    elb('walker run');
    expect(mockFn).toHaveBeenCalledTimes(1); // only once
    expect(mockOnRun).toHaveBeenCalledTimes(1); // only once
  });

  test('run register', () => {
    elb('walker on', 'run', mockFn);
    elb('walker run');
    expect(walkerjs.on.run![0]).toBe(mockFn);
  });

  test('run register init', () => {
    Walkerjs({
      on: { run: [mockFn] },
      default: true,
      destinations: { destination },
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnRun).toHaveBeenCalledTimes(1);
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
    Walkerjs({
      on: { run: [mockFn] },
      default: true,
      destinations: { destination },
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnRun).toHaveBeenCalledTimes(1);
  });

  test('consent error', () => {
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
    elb('walker on', 'run', mockFn);
    elb('walker run');
    elb('walker run');
    elb('walker run');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe('On Ready', () => {
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
    Walkerjs({
      destinations: { destination },
      on: { ready: [mockFn] },
      run: true,
    });
    const mockFnOn = jest.fn();
    elb('walker on', 'ready', mockFnOn);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFnOn).toHaveBeenCalledTimes(1);
    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });

  test('ready later', () => {
    readyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    Walkerjs({
      destinations: { destination },
      on: { ready: [mockFn] },
      run: true,
    });
    const mockFnOn = jest.fn();
    elb('walker on', 'ready', mockFnOn);

    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockFnOn).toHaveBeenCalledTimes(0);
    expect(mockOnReady).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as () => void)();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFnOn).toHaveBeenCalledTimes(1);
    expect(mockOnReady).toHaveBeenCalledTimes(1);
  });
});

describe('On Session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register', () => {
    walkerjs = Walkerjs({
      on: { session: [mockFn] },
      run: true,
    });
    const mockFnOn = jest.fn();
    elb('walker on', 'session', mockFnOn);

    expect(walkerjs.on.session![0]).toBe(mockFn);
    expect(walkerjs.on.session![1]).toBe(mockFnOn);
  });

  test('session disabled', () => {
    walkerjs = Walkerjs({
      on: { session: [mockFn] },
      run: true,
      session: false,
    });
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test('basics', () => {
    walkerjs = Walkerjs({
      destinations: { destination },
      run: true,
    });
    elb('walker on', 'session', mockFn);
    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnSession).toHaveBeenCalledTimes(1);
  });

  test('async with storage', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({
      destinations: { destination },
      on: { session: [mockFn] },
      run: true,
      session: { consent: 'marketing', storage: true },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockOnSession).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnSession).toHaveBeenCalledTimes(1);
  });

  test('async with custom cb', () => {
    const mockCb = jest.fn();
    walkerjs = Walkerjs({
      destinations: { destination },
      on: { session: [mockFn] },
      run: true,
      session: { cb: mockCb, consent: 'marketing', storage: true },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockOnSession).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockOnSession).toHaveBeenCalledTimes(1);
  });

  test('async with disabled cb', () => {
    walkerjs = Walkerjs({
      destinations: { destination },
      on: { session: [mockFn] },
      run: true,
      session: { cb: false, consent: 'marketing', storage: true },
    });

    expect(sessionStart).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledTimes(0);
    expect(mockOnSession).toHaveBeenCalledTimes(0);

    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockOnSession).toHaveBeenCalledTimes(1);
  });
});
