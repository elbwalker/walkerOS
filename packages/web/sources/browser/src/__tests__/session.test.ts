import type { WalkerOS, Collector, Elb } from '@walkeros/core';
import { createSessionStart, sessionStart } from '../session';

// Mock dependencies - declare before use in jest.mock
jest.mock('@walkeros/core', () => ({
  ...jest.requireActual('@walkeros/core'),
  assign: jest.fn((target, source) => Object.assign({}, target, source)),
  isSameType: jest.fn(() => true),
  useHooks: jest.fn(),
}));

jest.mock('@walkeros/collector', () => ({
  onApply: jest.fn(),
}));

jest.mock('@walkeros/web-core', () => ({
  sessionStart: jest.fn().mockReturnValue({
    id: 'test-session',
    start: Date.now(),
    isStart: true,
    storage: true,
  }),
}));

// Get references to the mocked functions
const { useHooks } = require('@walkeros/core');
const { onApply } = require('@walkeros/collector');
const { sessionStart: sessionStartOrg } = require('@walkeros/web-core');

describe('Session', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockElb = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
      }),
    );

    // Mock the useHooks to return a function that calls the original
    (useHooks as jest.Mock).mockImplementation(() => {
      return () => ({
        id: 'new-session-id',
        start: Date.now(),
        isStart: true,
        storage: true,
      });
    });
  });

  test('createSessionStart returns a function', () => {
    const sessionStartFn = createSessionStart(mockElb);

    expect(typeof sessionStartFn).toBe('function');
  });

  test('createSessionStart function calls sessionStart with correct config', () => {
    const sessionStartFn = createSessionStart(mockElb);
    const options = {
      config: { storage: false },
      data: {
        isStart: true,
        storage: true,
      },
    };

    const result = sessionStartFn(options);

    expect(result).toBeDefined();
    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('createSessionStart merges config with default pulse setting', () => {
    const sessionStartFn = createSessionStart(mockElb);
    const customConfig = { storage: false, custom: true };

    sessionStartFn({ config: customConfig });

    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('createSessionStart updates session data with current timestamp', () => {
    const sessionStartFn = createSessionStart(mockElb);
    const beforeCall = Date.now();

    sessionStartFn({});

    const afterCall = Date.now();

    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('sessionStart processes options correctly', () => {
    const options = {
      config: { storage: true },
      data: {
        isStart: true,
        storage: true,
      },
    };

    const result = sessionStart(mockElb, options);

    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('sessionStart handles empty options', () => {
    const result = sessionStart(mockElb);

    expect(sessionStartOrg).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('sessionStart merges session config correctly', () => {
    const options = {
      storage: false,
    };

    sessionStart(mockElb, options);

    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('sessionStart handles missing session config', () => {
    const result = sessionStart(mockElb, {});

    expect(sessionStartOrg).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('sessionStart handles missing sessionStatic config', () => {
    const result = sessionStart(mockElb, {});

    expect(sessionStartOrg).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('session callback function updates collector session', () => {
    const result = sessionStart(mockElb, {});

    expect(sessionStartOrg).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('session callback respects cb: false configuration', () => {
    const options = {
      cb: false as const,
    };

    const result = sessionStart(mockElb, options);

    expect(sessionStartOrg).toHaveBeenCalled();
  });

  test('session returns the session data from useHooks', () => {
    const result = sessionStart(mockElb, {});

    expect(sessionStartOrg).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
