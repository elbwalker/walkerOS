import { elb, Walkerjs } from '..';
import type { WebClient } from '..';

describe('Commands on', () => {
  const w = window;
  const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    jest.clearAllMocks();
    jest.resetModules();
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockDataLayer;
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;

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
    expect(walkerjs.config.on.consent![0].foo).toBe(mockFn);
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
    expect(mockDataLayer).toHaveBeenCalledTimes(1);
  });

  test('multiple functions', () => {
    const mockFnA = jest.fn();
    const mockFnB = jest.fn();
    const mockFnC = jest.fn();
    elb('walker on', 'consent', [
      { automatically: mockFnA },
      { automatically: mockFnB },
    ]);

    expect(walkerjs.config.on.consent).toHaveLength(2);
    expect(mockFnA).toHaveBeenCalledTimes(1);
    expect(mockFnB).toHaveBeenCalledTimes(1);
    // Add a new function
    jest.clearAllMocks();
    elb('walker on', 'consent', { automatically: mockFnC });
    expect(walkerjs.config.on.consent).toHaveLength(3);
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
});
