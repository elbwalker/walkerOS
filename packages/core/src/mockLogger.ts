import type { Instance } from './types/logger';

/**
 * Mock logger instance for testing
 * Includes all logger methods as jest.fn() plus tracking of scoped loggers
 * Extends Instance to ensure type compatibility
 */
export interface MockLogger extends Instance {
  error: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
  throw: jest.Mock<never, [string | Error, unknown?]>;
  scope: jest.Mock<MockLogger, [string]>;

  /**
   * Array of all scoped loggers created by this logger
   * Useful for asserting on scoped logger calls in tests
   */
  scopedLoggers: MockLogger[];
}

/**
 * Create a mock logger for testing
 * All methods are jest.fn() that can be used for assertions
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 *
 * // Use in code under test
 * someFunction(mockLogger);
 *
 * // Assert on calls
 * expect(mockLogger.error).toHaveBeenCalledWith('error message');
 *
 * // Assert on scoped logger
 * const scoped = mockLogger.scopedLoggers[0];
 * expect(scoped.debug).toHaveBeenCalledWith('debug in scope');
 * ```
 */
export function createMockLogger(): MockLogger {
  const scopedLoggers: MockLogger[] = [];

  const mockThrow = jest.fn((message: string | Error): never => {
    const msg = message instanceof Error ? message.message : message;
    throw new Error(msg);
  }) as jest.Mock<never, [string | Error, unknown?]>;

  const mockScope = jest.fn((_name: string): MockLogger => {
    const scoped = createMockLogger();
    scopedLoggers.push(scoped);
    return scoped;
  }) as jest.Mock<MockLogger, [string]>;

  const mockLogger: MockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: mockThrow,
    scope: mockScope,
    scopedLoggers,
  };

  return mockLogger;
}
