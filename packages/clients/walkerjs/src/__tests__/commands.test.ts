import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import type { WebClient } from '..';

describe('Commands on consent', () => {
  let walkerjs: WebClient.Instance;

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

describe('Commands on run', () => {
  let walkerjs: WebClient.Instance;

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

  test('globals update', () => {
    walkerjs = Walkerjs({ default: true, globalsStatic: { static: 'value' } });
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: { static: 'value' },
      }),
    );

    elb('walker globals', { foo: 'bar' });
    elb('walker globals', { another: 'value' });
    elb('walker globals', { static: 'override' });
    elb('foo bar');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: {
          static: 'override',
          foo: 'bar',
          another: 'value',
        },
      }),
    );
  });

  test('custom', () => {
    walkerjs = Walkerjs({ default: true, custom: { static: 'value' } });
    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        custom: { static: 'value' },
      }),
    );

    elb('walker custom', { foo: 'bar' });
    elb('walker custom', { another: 'value' });
    elb('walker custom', { static: 'override' });
    elb('foo bar');
    expect(walkerjs).toStrictEqual(
      expect.objectContaining({
        custom: {
          static: 'override',
          foo: 'bar',
          another: 'value',
        },
      }),
    );
  });
});
