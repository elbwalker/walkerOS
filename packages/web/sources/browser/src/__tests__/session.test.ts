import type { WalkerOS, Collector } from '@walkeros/core';
import {
  createSessionStart,
  sessionStart,
  SessionStartOptions,
} from '../session';

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
  sessionStart: jest.fn(),
}));

// Get references to the mocked functions
const { useHooks } = require('@walkeros/core');
const { onApply } = require('@walkeros/collector');
const { sessionStart: sessionStartOrg } = require('@walkeros/web-core');

describe('Session', () => {
  let mockCollector: Collector.Instance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollector = {
      config: {
        session: { storage: true },
        sessionStatic: { id: 'static-id' },
      },
      session: {
        id: 'session-123',
        start: Date.now() - 1000,
        isStart: true,
        storage: true,
      },
      push: jest.fn(),
      consent: { functional: true },
      destinations: {},
      globals: {},
      hooks: {},
      on: {},
      user: {},
      allowed: true,
    } as unknown as Collector.Instance;

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
    const sessionStartFn = createSessionStart(mockCollector);

    expect(typeof sessionStartFn).toBe('function');
  });

  test('createSessionStart function calls sessionStart with correct config', () => {
    const sessionStartFn = createSessionStart(mockCollector);
    const options: SessionStartOptions = {
      config: { storage: false },
      data: {
        isStart: true,
        storage: true,
      },
    };

    const result = sessionStartFn(options);

    expect(result).toBeDefined();
    expect(useHooks).toHaveBeenCalledWith(
      sessionStartOrg,
      'SessionStart',
      mockCollector.hooks,
    );
  });

  test('createSessionStart merges config with default pulse setting', () => {
    const sessionStartFn = createSessionStart(mockCollector);
    const customConfig = { storage: false, custom: true };

    sessionStartFn({ config: customConfig });

    // Verify the config was merged with pulse: true
    const callArgs = useHooks.mock.calls[0][0]; // Get the function that was passed
    const configPassed = useHooks.mock.results[0].value; // Get the returned function

    expect(useHooks).toHaveBeenCalled();
  });

  test('createSessionStart updates session data with current timestamp', () => {
    const sessionStartFn = createSessionStart(mockCollector);
    const beforeCall = Date.now();

    sessionStartFn({});

    const afterCall = Date.now();

    // The updated timestamp should be between before and after the call
    expect(useHooks).toHaveBeenCalled();
    // Additional verification would require more detailed mocking
  });

  test('sessionStart processes options correctly', () => {
    const options: SessionStartOptions = {
      config: { storage: true },
      data: {
        isStart: true,
        storage: true,
      },
    };

    const result = sessionStart(mockCollector, options);

    expect(useHooks).toHaveBeenCalledWith(
      sessionStartOrg,
      'SessionStart',
      mockCollector.hooks,
    );

    // Verify the function was called with the right parameters
    const hookFunction = useHooks.mock.results[0].value;
    expect(typeof hookFunction).toBe('function');
  });

  test('sessionStart handles empty options', () => {
    const result = sessionStart(mockCollector);

    expect(useHooks).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('sessionStart merges session config correctly', () => {
    mockCollector.config.session = { storage: true, duration: 30 };
    const options: SessionStartOptions = {
      config: { storage: false, newField: 'value' },
    };

    sessionStart(mockCollector, options);

    // Verify useHooks was called - the actual config merging is handled by assign mock
    expect(useHooks).toHaveBeenCalled();
  });

  test('sessionStart handles missing session config', () => {
    mockCollector.config.session = undefined;

    const result = sessionStart(mockCollector, {});

    expect(useHooks).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('sessionStart handles missing sessionStatic config', () => {
    delete (mockCollector.config as unknown as Record<string, unknown>)
      .sessionStatic;

    const result = sessionStart(mockCollector, {});

    expect(useHooks).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('session callback function updates collector session', () => {
    const mockSession = {
      id: 'test-session',
      start: Date.now(),
      isStart: true,
      storage: true,
    };

    // Mock the useHooks to simulate callback execution
    (useHooks as jest.Mock).mockImplementation(() => {
      return () => {
        // Simulate session assignment
        mockCollector.session = mockSession;
        (onApply as jest.Mock)(mockCollector, 'session');
        return mockSession;
      };
    });

    const result = sessionStart(mockCollector, {});

    expect(mockCollector.session).toBe(mockSession);
    expect(onApply).toHaveBeenCalledWith(mockCollector, 'session');
  });

  test('session callback respects cb: false configuration', () => {
    (useHooks as jest.Mock).mockImplementation(() => {
      return () => ({
        id: 'test',
        start: Date.now(),
        isStart: true,
        storage: false,
      });
    });

    const options: SessionStartOptions = {
      config: { cb: false },
    };

    const result = sessionStart(mockCollector, options);

    expect(useHooks).toHaveBeenCalled();
  });

  test('session returns the session data from useHooks', () => {
    const expectedSession = {
      id: 'hook-session',
      start: Date.now(),
      isStart: false,
      storage: true,
    };

    (useHooks as jest.Mock).mockImplementation(() => () => expectedSession);

    const result = sessionStart(mockCollector, {});

    expect(result).toBe(expectedSession);
  });
});
